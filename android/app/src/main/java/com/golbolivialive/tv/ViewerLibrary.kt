package com.golbolivialive.tv

import org.json.JSONArray

object ViewerLibrary {
    fun recentIds(value: String?): List<String> = runCatching {
        val array = JSONArray(value ?: "[]")
        (0 until minOf(array.length(), 12)).mapNotNull { array.optString(it).takeIf { id -> id.startsWith("match:") || id.startsWith("channel:") } }.distinct()
    }.getOrDefault(emptyList())

    fun remember(ids: List<String>, id: String): String = JSONArray((listOf(id) + ids).distinct().take(12)).toString()

    fun available(ids: List<String>, items: List<WatchItem>): List<WatchItem> {
        val indexed = items.associateBy { it.id }
        return ids.mapNotNull { indexed[it] }
    }
}
