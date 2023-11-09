package com.codestream.extensions

import org.apache.commons.lang3.time.StopWatch

fun StopWatch.stats(): String {
    return "=-> ${this.message} ${this.time}ms"
}

fun startWithName(name: String): StopWatch {
    val sw = StopWatch(name)
    sw.start()
    return sw
}
