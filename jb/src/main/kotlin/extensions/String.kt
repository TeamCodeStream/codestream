package com.codestream.extensions

fun String?.ifNullOrBlank(defaultValue: () -> String): String =
    if (this.isNullOrBlank()) defaultValue() else this


val String?.isTruthy: Boolean
    get() {
        return when(this?.toLowerCase()) {
            null -> false
            "true" -> true
            "1" -> true
            else -> false
        }
    }
