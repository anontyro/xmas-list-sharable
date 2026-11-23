import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CopyLinkButton from "@/components/ui/CopyLinkButton";
import { ownerLoginPath } from "@/features/authentication/prefill";

/** The sign-in links an admin can send: one with the name filled in and, when the PIN was just set here, one with the PIN too. */
export default function SignInLinks({ name, pin }: { name: string; pin?: string }) {
  const row = (path: string, what: string) => (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Typography variant="body2" sx={{ wordBreak: "break-all", flexGrow: 1 }}>{path}</Typography>
      <CopyLinkButton path={path} what={what} />
    </Stack>
  );
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" component="h3" sx={{ pt: 1 }}>Sign-in link for {name}</Typography>
      <Typography variant="body2" color="text.secondary">
        Opens the sign-in page with their name filled in. They can change their PIN once they are in, and you can still reset it here.
      </Typography>
      {row(ownerLoginPath(name), `sign-in link for ${name}`)}
      {pin && (
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            Or a link that also has the PIN you just set. Anyone who sees this link can sign in as {name}, so send it privately.
          </Typography>
          {row(ownerLoginPath(name, pin), `sign-in link for ${name} with PIN`)}
        </Stack>
      )}
    </Stack>
  );
}
