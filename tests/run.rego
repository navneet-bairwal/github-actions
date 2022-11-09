package kubernetes.validating.existence

import future.keywords.contains
import future.keywords.if

# This definition checks if the costcenter label is not provided. Each rule definition
# contributes to the set of error messages.
deny contains msg if {
	# The `not` keyword turns an undefined statement into a true statement. If any
	# of the keys are missing, this statement will be true.
	not input.request.object.metadata.labels.costcenter
	msg := "Every resource must have a costcenter label"
}

# This definition checks if the costcenter label is formatted appropriately. Each rule
# definition contributes to the set of error messages.
deny contains msg if {
	value := input.request.object.metadata.labels.costcenter
	not startswith(value, "cccode-")
	msg := sprintf("Costcenter code must start with `cccode-`; found `%v`", [value])
}
