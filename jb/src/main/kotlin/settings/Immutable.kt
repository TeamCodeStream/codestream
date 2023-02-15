package com.codestream.system

/*
Rider 2022.2.4 doesn't play nice with kotlinx immutable, need to have our own

Solution from https://stackoverflow.com/questions/37931676/how-to-turn-a-mutable-collection-into-an-immutable-one
*/

class ImmutableList<T>(private val inner:List<T>) : List<T> by inner
class ImmutableMap<K, V>(private val inner: Map<K, V>) : Map<K, V> by inner


fun <K, V> Map<K, V>.toImmutableMap(): Map<K, V> {
    if (this is ImmutableMap<K, V>) {
        return this
    } else {
        return ImmutableMap(this)
    }
}

fun <T> List<T>.toImmutableList(): List<T> {
    if (this is ImmutableList<T>) {
        return this
    } else {
        return ImmutableList(this)
    }
}
