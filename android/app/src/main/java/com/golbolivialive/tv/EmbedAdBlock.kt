package com.golbolivialive.tv

import java.net.URI

object EmbedAdBlock {
    private val domains = setOf("doubleclick.net", "googlesyndication.com", "googleadservices.com", "googletagservices.com",
        "adnxs.com", "adsrvr.org", "pubmatic.com", "rubiconproject.com", "openx.net", "criteo.com", "adform.net", "popads.net", "popcash.net")

    fun blocked(source: WatchSource, value: String): Boolean {
        if (source.provider in setOf("YouTube", "Kick")) return false
        val uri = runCatching { URI(value) }.getOrNull() ?: return false
        if (uri.scheme !in setOf("https", "http")) return false
        val host = uri.host?.lowercase()?.trimEnd('.') ?: return false
        val player = runCatching { URI(source.url).host?.lowercase()?.trimEnd('.') }.getOrNull()
        if (host == player) return false
        return domains.any { host == it || host.endsWith(".$it") }
    }
}
