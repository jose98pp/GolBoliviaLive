package com.golbolivialive.tv

object BroadcastStartup {
    fun canRetry(waiting: Boolean, status: Int?, hasPlayed: Boolean, attempts: Int, elapsedMs: Long) =
        waiting && status == 404 && !hasPlayed && attempts < 3 && elapsedMs in 0..28000
}
