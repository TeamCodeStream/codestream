package com.codestream.system

// Credit: gpt-4-32k
class LRUMap<K, V>(private val maxSize: Int) : LinkedHashMap<K, V>(maxSize, 0.75f, true) {

    override fun removeEldestEntry(eldest: MutableMap.MutableEntry<K, V>?): Boolean {
        return this.size > maxSize
    }
}
