package com.golbolivialive.tv

import org.junit.Assert.*
import org.junit.Test

class EmbedNavigationTest {
    private val source = WatchSource("iframe", "https://player.example/live", true)
    @Test fun childPlayerRemainsEmbeddedButCannotReplaceWrapper() {
        assertTrue(EmbedNavigation.allowed(source, source.url, false))
        assertFalse(EmbedNavigation.allowed(source, source.url, true))
        assertTrue(EmbedNavigation.allowed(source, EmbedDocument.origin, true))
    }
    @Test fun rejectsExternalAdsAppsAndUnsafeSchemes() {
        listOf("https://ads.example/popup", "intent://player", "javascript:alert(1)", "http://player.example/live", "file:///etc/passwd", "https://player.example.ads.example/").forEach {
            assertFalse(EmbedNavigation.allowed(source, it, false))
            assertFalse(EmbedNavigation.allowed(source, it, true))
        }
    }
    @Test fun officialPlayersRetainTheirFrameHosts() {
        assertTrue(EmbedNavigation.allowed(WatchSource("YouTube", "https://www.youtube.com/embed/abc", true), "https://www.youtube.com/embed/abc", false))
        assertTrue(EmbedNavigation.allowed(WatchSource("Kick", "https://player.kick.com/channel", true), "https://player.kick.com/channel", false))
    }
}
