"use strict";

const GITHUB_API = "https://api.github.com";
const TRIGGER_LABEL = "issueops-trigger";
const POLL_INTERVAL_MS = 7000;
const PR_COMMENT_MARKER = "<!-- issueops-pr -->";

const els = {
  owner: document.getElementById("owner"),
  repo: document.getElementById("repo"),
  token: document.getElementById("token"),
  filename: document.getElementById("filename"),
  content: document.getElementById("content"),
  submit: document.getElementById("submit-btn"),
  reset: document.getElementById("reset-btn"),
  formCard: document.getElementById("form-card"),
  progressCard: document.getElementById("progress-card"),
  banner: document.getElementById("banner"),
};

const state = {
  owner: "",
  repo: "",
  token: "",
  issueNumber: null,
  prNumber: null,
  pollTimer: null,
};

restoreSessionInputs();
els.submit.addEventListener("click", onSubmit);
els.reset.addEventListener("click", resetUI);

function restoreSessionInputs() {
  els.owner.value = sessionStorage.getItem("issueops.owner") || "";
  els.repo.value = sessionStorage.getItem("issueops.repo") || "";
  els.token.value = sessionStorage.getItem("issueops.token") || "";
}

function persistSessionInputs() {
  sessionStorage.setItem("issueops.owner", state.owner);
  sessionStorage.setItem("issueops.repo", state.repo);
  sessionStorage.setItem("issueops.token", state.token);
}

function showBanner(kind, msg) {
  els.banner.className = `status-banner show ${kind}`;
  els.banner.textContent = msg;
}

function hideBanner() {
  els.banner.className = "status-banner";
}

function setStep(stepNum, status, detailHtml) {
  const step = document.querySelector(`.step[data-step="${stepNum}"]`);
  if (!step) return;
  step.classList.remove("pending", "active", "done", "error");
  step.classList.add(status);
  if (detailHtml !== undefined) {
    document.getElementById(`step${stepNum}-detail`).innerHTML = detailHtml;
  }
}

async function gh(path, opts = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...opts,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${state.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function onSubmit() {
  hideBanner();
  state.owner = els.owner.value.trim();
  state.repo = els.repo.value.trim();
  state.token = els.token.value.trim();

  if (!state.owner || !state.repo || !state.token) {
    showBanner("error", "Owner, repository, and token are all required.");
    return;
  }
  const filename = els.filename.value.trim() || "hello.txt";
  const content = els.content.value;
  persistSessionInputs();

  els.submit.disabled = true;
  els.submit.textContent = "Opening issue...";

  const body = [
    "<!-- issueops-payload -->",
    "```yaml",
    `filename: ${filename}`,
    "content: |",
    content.split("\n").map((line) => `  ${line}`).join("\n"),
    "```",
    "",
    "_Triggered from the IssueOps GitHub Pages frontend._",
  ].join("\n");

  try {
    const issue = await gh(`/repos/${state.owner}/${state.repo}/issues`, {
      method: "POST",
      body: JSON.stringify({
        title: `IssueOps: create ${filename}`,
        body,
        labels: [TRIGGER_LABEL],
      }),
    });
    state.issueNumber = issue.number;
    els.formCard.classList.add("hidden");
    els.progressCard.classList.remove("hidden");
    setStep(1, "done", `Issue <a href="${issue.html_url}" target="_blank">#${issue.number}</a> created.`);
    setStep(2, "active", "Waiting for workflow to start...");
    startPolling();
  } catch (err) {
    showBanner("error", err.message);
    els.submit.disabled = false;
    els.submit.textContent = "Open Issue & Trigger Workflow";
  }
}

function startPolling() {
  pollOnce();
  state.pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (state.pollTimer) clearInterval(state.pollTimer);
  state.pollTimer = null;
}

async function pollOnce() {
  try {
    if (!state.prNumber) {
      const prInfo = await findPRFromIssueComments();
      if (prInfo) {
        state.prNumber = prInfo.number;
        setStep(2, "done", "Workflow generated the file and pushed a branch.");
        setStep(3, "done", `PR <a href="${prInfo.url}" target="_blank">#${prInfo.number}</a> opened.`);
        setStep(4, "active", "Waiting for review and merge...");
      } else {
        await reflectWorkflowProgress();
      }
    }
    if (state.prNumber) {
      const pr = await gh(`/repos/${state.owner}/${state.repo}/pulls/${state.prNumber}`);
      if (pr.merged) {
        setStep(4, "done", "PR merged.");
        setStep(5, "done", `Completed. <a href="${pr.html_url}" target="_blank">View PR #${pr.number}</a>`);
        stopPolling();
      } else if (pr.state === "closed") {
        setStep(4, "error", "PR was closed without merging.");
        setStep(5, "error", "Not completed.");
        stopPolling();
      } else {
        setStep(4, "active", `PR #${pr.number} is open. Awaiting merge...`);
      }
    }
  } catch (err) {
    showBanner("error", `Polling error: ${err.message}`);
  }
}

async function findPRFromIssueComments() {
  const comments = await gh(
    `/repos/${state.owner}/${state.repo}/issues/${state.issueNumber}/comments?per_page=100`
  );
  for (const c of comments) {
    if (!c.body || !c.body.includes(PR_COMMENT_MARKER)) continue;
    const match = c.body.match(/#(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      const urlMatch = c.body.match(/https:\/\/github\.com\/[^\s)]+\/pull\/\d+/);
      return { number: num, url: urlMatch ? urlMatch[0] : `https://github.com/${state.owner}/${state.repo}/pull/${num}` };
    }
  }
  return null;
}

async function reflectWorkflowProgress() {
  try {
    const runs = await gh(
      `/repos/${state.owner}/${state.repo}/actions/runs?event=issues&per_page=20`
    );
    const match = (runs.workflow_runs || []).find((r) =>
      (r.display_title || r.name || "").includes(`#${state.issueNumber}`) ||
      r.head_branch?.includes(`issueops/${state.issueNumber}-`)
    );
    if (match) {
      const label = match.status === "completed" ? match.conclusion : match.status;
      setStep(2, match.status === "completed" && match.conclusion !== "success" ? "error" : "active",
        `Workflow ${label}. <a href="${match.html_url}" target="_blank">View run</a>`);
    }
  } catch {
    // Non-fatal; the PR comment is the primary signal.
  }
}

function resetUI() {
  stopPolling();
  state.issueNumber = null;
  state.prNumber = null;
  els.formCard.classList.remove("hidden");
  els.progressCard.classList.add("hidden");
  els.submit.disabled = false;
  els.submit.textContent = "Open Issue & Trigger Workflow";
  document.querySelectorAll(".step").forEach((s) => {
    s.classList.remove("done", "active", "error");
    s.classList.add("pending");
  });
  document.getElementById("step1-detail").textContent = "Triggering backend...";
  document.getElementById("step2-detail").textContent = "Waiting for workflow to start...";
  document.getElementById("step3-detail").textContent = "No PR yet.";
  document.getElementById("step4-detail").textContent = "PR not yet open.";
  document.getElementById("step5-detail").textContent = "Not yet merged.";
  hideBanner();
}
