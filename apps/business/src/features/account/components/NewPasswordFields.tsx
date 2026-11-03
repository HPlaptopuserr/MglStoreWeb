import { PasswordInput } from "@/shared/ui/forms/PasswordInput";
export function NewPasswordFields({ change }: { change: boolean }) {
  return (
    <>
      {change && (
        <label htmlFor="current-password">
          Одоогийн нууц үг
          <PasswordInput
            id="current-password"
            name="currentPassword"
            autoComplete="current-password"
            required
            maxLength={1024}
          />
        </label>
      )}
      <label htmlFor="new-password">
        Шинэ нууц үг
        <PasswordInput
          id="new-password"
          name="password"
          autoComplete="new-password"
          required
          minLength={6}
          maxLength={72}
          aria-describedby="password-hint"
        />
      </label>
      <p id="password-hint" className="account-hint">
        6–72 тэмдэгт. Таахад хэцүү, бусад бүртгэлд ашиглаагүй нууц үг сонгоорой.
      </p>
      <label htmlFor="confirm-password">
        Шинэ нууц үг давтах
        <PasswordInput
          id="confirm-password"
          name="confirmation"
          autoComplete="new-password"
          required
          minLength={6}
          maxLength={72}
        />
      </label>
    </>
  );
}
