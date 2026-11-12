import history from "app/core/history"
import { signOut } from "app/core/auth"

export const goHome = () => history.push("/")

export const submitSignOut = () => {
  void signOut()
}
