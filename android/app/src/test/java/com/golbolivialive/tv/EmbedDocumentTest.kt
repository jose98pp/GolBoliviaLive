package com.golbolivialive.tv

import org.junit.Assert.*
import org.junit.Test
import org.w3c.dom.Document
import java.io.ByteArrayInputStream
import javax.xml.parsers.DocumentBuilderFactory

class EmbedDocumentTest {
    private fun parse(html: String): Document = DocumentBuilderFactory.newInstance()
        .newDocumentBuilder().parse(ByteArrayInputStream(html.toByteArray(Charsets.UTF_8)))

    @Test fun restrictedProviderIsAChildFrameInsteadOfTheTopDocument() {
        val source = WatchSource("Web", "https://example.com/embed/match?id=12&quality=auto", true)
        val page = parse(EmbedDocument.iframe(source, false))
        val frames = page.getElementsByTagName("iframe")
        assertEquals(1, frames.length)
        val frame = frames.item(0) as org.w3c.dom.Element
        assertEquals(source.url, frame.getAttribute("src"))
        assertEquals("body", frame.parentNode.nodeName)
        assertEquals("allowfullscreen", frame.getAttribute("allowfullscreen"))
        assertTrue(frame.getAttribute("allow").contains("encrypted-media"))
        assertFalse(frame.getAttribute("sandbox").contains("allow-top-navigation"))
    }

    @Test fun kickUsesItsOfficialPlayerInsideAnIframeWithAutoplayPreference() {
        val source = WatchSource("Kick", "https://player.kick.com/golbolivia", true)
        for (autoplay in listOf(false, true)) {
            val frame = parse(EmbedDocument.iframe(source, autoplay)).getElementsByTagName("iframe").item(0) as org.w3c.dom.Element
            assertEquals("https://player.kick.com/golbolivia?autoplay=$autoplay&muted=false", frame.getAttribute("src"))
        }
        assertEquals("https://com.golbolivialive.tv/", EmbedDocument.origin)
    }

    @Test fun providerUrlAndTitleCannotInjectExtraMarkup() {
        val source = WatchSource("Web\"/><script>bad()</script>", "https://example.com/embed?a=%22&b=%3Cscript%3E", true)
        val page = parse(EmbedDocument.iframe(source, true))
        assertEquals(0, page.getElementsByTagName("script").length)
        val frame = page.getElementsByTagName("iframe").item(0) as org.w3c.dom.Element
        assertEquals(source.url, frame.getAttribute("src"))
        assertEquals(source.provider, frame.getAttribute("title"))
    }

    @Test(expected = IllegalArgumentException::class)
    fun rejectsLocalOrNonHttpsContent() { EmbedDocument.iframe(WatchSource("Web", "file:///sdcard/test.html", true), true) }
}
