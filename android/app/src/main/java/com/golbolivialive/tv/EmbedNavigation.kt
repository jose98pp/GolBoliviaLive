package com.golbolivialive.tv

import java.net.URI

object EmbedNavigation {
    fun allowed(source: WatchSource, value: String, mainFrame: Boolean): Boolean {
        if (Catalog.https(value) == null) return false
        val host = runCatching { URI(value).host }.getOrNull() ?: return false
        if (host == URI(EmbedDocument.origin).host) return true
        if (mainFrame) return false
        return when (source.provider) {
            "YouTube" -> host in setOf("www.youtube.com", "www.youtube-nocookie.com")
            "Kick" -> host == "player.kick.com"
            else -> host == URI(source.url).host
        }
    }
}
