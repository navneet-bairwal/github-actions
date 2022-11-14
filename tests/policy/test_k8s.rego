package main

import data.kubernetes
import future.keywords.contains
import future.keywords.if

# This definition checks if the costcenter label is not provided. Each rule definition
# contributes to the set of error messages.
deny contains msg if {
	# The `not` keyword turns an undefined statement into a true statement. If any
	# of the keys are missing, this statement will be true.
	not input.metadata.team
	not input.metadata.annotations.team
	msg := "Every resource must have a \"team\"  label, refer: https:\/\/opengovinc.atlassian.net\/wiki\/spaces\/CloudPlatform\/pages\/2853929005\/Tagging+Annotation+Guidelines"
}
deny contains msg if {
	# The `not` keyword turns an undefined statement into a true statement. If any
	# of the keys are missing, this statement will be true.
	not input.metadata.environment
	not input.metadata.annotations.environment
	msg := "Every resource must have a \"environment\"  label, refer: https:\/\/opengovinc.atlassian.net\/wiki\/spaces\/CloudPlatform\/pages\/2853929005\/Tagging+Annotation+Guidelines"
}
deny contains msg if {
	# The `not` keyword turns an undefined statement into a true statement. If any
	# of the keys are missing, this statement will be true.
	not input.metadata.service
	not input.metadata.annotations.service
	msg := "Every resource must have a \"service\"  label, refer: https:\/\/opengovinc.atlassian.net\/wiki\/spaces\/CloudPlatform\/pages\/2853929005\/Tagging+Annotation+Guidelines"
}
deny contains msg if {
	# The `not` keyword turns an undefined statement into a true statement. If any
	# of the keys are missing, this statement will be true.
	not input.metadata.suite
	not input.metadata.annotations.suite
	msg := "Every resource must have a \"suite\"  label, refer: https:\/\/opengovinc.atlassian.net\/wiki\/spaces\/CloudPlatform\/pages\/2853929005\/Tagging+Annotation+Guidelines"
}
deny contains msg if {
	# The `not` keyword turns an undefined statement into a true statement. If any
	# of the keys are missing, this statement will be true.
	not input.metadata.department
	not input.metadata.annotations.department
	msg := "Every resource must have a \"department\"  label, refer: https:\/\/opengovinc.atlassian.net\/wiki\/spaces\/CloudPlatform\/pages\/2853929005\/Tagging+Annotation+Guidelines"
}

