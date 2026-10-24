package com.golbolivialive.tv

object ImageUrls {
    fun normalize(value: String): String {
        val raw = value.trim().replace(" ", "%20")
        if (raw.length > 2000 || raw.isBlank()) return ""
        val url = when {
            raw.startsWith("//") -> "https:$raw"
            raw.startsWith("/") -> BuildConfig.PUBLIC_BASE_URL + raw
            raw.startsWith("http://", true) -> "https://" + raw.substring(7)
            else -> raw
        }
        return Catalog.https(url).orEmpty()
    }
}
