package com.golbolivialive.tv

import org.junit.Assert.*
import org.junit.Test

class EmbedAdBlockTest {
    private val player = WatchSource("Web", "https://player.example/live", true)
    @Test fun blocksKnownAdvertisingHostsAndSubdomains() {
        assertTrue(EmbedAdBlock.blocked(player, "https://ads.doubleclick.net/pagead/ads"))
        assertTrue(EmbedAdBlock.blocked(player, "https://popads.net/popup.js"))
        assertTrue(EmbedAdBlock.blocked(player, "http://a.googlesyndication.com/ad.js"))
    }
    @Test fun preservesPlayerVideoCdnsAndLookalikeDomains() {
        listOf("https://player.example/player.js", "https://cdn.example/video.m3u8", "https://notdoubleclick.net/player.js", "https://doubleclick.net.safe.example/logo.png", "blob:https://player.example/123").forEach {
            assertFalse(EmbedAdBlock.blocked(player, it))
        }
        assertFalse(EmbedAdBlock.blocked(WatchSource("Web", "https://popads.net/player", true), "https://popads.net/main.js"))
    }
    @Test fun officialYoutubeAndKickPlayersRetainTheirOwnRequests() {
        for (provider in listOf("YouTube", "Kick")) assertFalse(EmbedAdBlock.blocked(WatchSource(provider, "https://player.example/embed", true), "https://doubleclick.net/ads"))
    }
}
