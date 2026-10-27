package com.golbolivialive.tv

class RemotePress {
    enum class Result { NONE, CLICK, HELD }
    private var pressed = false
    private var longPress = false
    fun down(): Boolean {
        if (pressed) return false
        pressed = true; longPress = false
        return true
    }
    fun hold(): Boolean {
        if (!pressed || longPress) return false
        longPress = true
        return true
    }
    fun up(): Result {
        val result = if (!pressed) Result.NONE else if (longPress) Result.HELD else Result.CLICK
        cancel()
        return result
    }
    fun cancel() { pressed = false; longPress = false }
}
