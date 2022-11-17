package kubernetes.annotations

# resource_type := "Deployment"

environment_annotation[d] {
    d = parse(input)[_]
    not d.metadata.annotations["team"]
}

fizzbuzz_annotation[d] {
    d = parse(input)[_]
    not d.metadata.annotations["fizzbuzz"]
}

parse(i) = result {
    i["items"]
    result := [ i.items[d] ]
}