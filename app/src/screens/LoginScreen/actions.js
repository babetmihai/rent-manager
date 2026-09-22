import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "app/core/auth"


export const submitLogin = (event, email, password, isSignIn) => {
  event.preventDefault()
  if (isSignIn) {
    void signInWithEmail(email, password)
    return
  }
  void signUpWithEmail(email, password)
}

export const submitGoogle = () => {
  void signInWithGoogle()
}
