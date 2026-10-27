package com.golbolivialive.tv

import org.junit.Assert.*
import org.junit.Test

class RemotePressTest {
    @Test fun shortPressSendsExactlyOneClickOnRelease() {
        val press = RemotePress()
        assertTrue(press.down()); assertFalse(press.down())
        assertEquals(RemotePress.Result.CLICK, press.up())
        assertEquals(RemotePress.Result.NONE, press.up())
    }
    @Test fun heldOkOpensOptionsWithoutClickingTheIframe() {
        val press = RemotePress(); press.down()
        assertTrue(press.hold()); assertFalse(press.hold()); assertFalse(press.down())
        assertEquals(RemotePress.Result.HELD, press.up())
    }
    @Test fun cancellationAndLateTimersCannotActivateAnotherScreen() {
        val press = RemotePress(); press.down(); press.cancel()
        assertFalse(press.hold()); assertEquals(RemotePress.Result.NONE, press.up())
        press.down(); assertEquals(RemotePress.Result.CLICK, press.up())
    }
}
