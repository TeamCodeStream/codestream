import kotlin.io.path.Path

fun which(executable: String): String? {
    val paths = System.getenv("PATH")?.split(":") ?: return null
    for (path in paths) {
        val file = Path(path).resolve(executable).toFile()
        if (file.exists()) {
            return file.absolutePath
        }
    }
    return null
}
