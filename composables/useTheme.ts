import { useState } from "#app"

export const useTheme = () => {
    const theme = useState("theme", () => "dark")
    const toggle = () => { theme.value = theme.value === "dark" ? "light" : "dark" }
    return { theme, toggle }
}
