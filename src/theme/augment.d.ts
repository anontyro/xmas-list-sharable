import "@mui/material/styles";
import "@mui/material/Button";
import "@mui/material/Chip";

// The tinted colours of the Sticker Book, usable as `<Button color="yellow">` and `<Chip color="mint">`.
declare module "@mui/material/styles" {
  interface Palette {
    yellow: Palette["primary"];
    sky: Palette["primary"];
    pink: Palette["primary"];
    mint: Palette["primary"];
  }
  interface PaletteOptions {
    yellow?: PaletteOptions["primary"];
    sky?: PaletteOptions["primary"];
    pink?: PaletteOptions["primary"];
    mint?: PaletteOptions["primary"];
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsColorOverrides {
    yellow: true;
    sky: true;
    pink: true;
    mint: true;
  }
  interface ButtonPropsVariantOverrides {
    /** Dashed outline, no shadow: the design's secondary / ghost button. */
    ghost: true;
  }
}

declare module "@mui/material/Chip" {
  interface ChipPropsColorOverrides {
    yellow: true;
    sky: true;
    pink: true;
    mint: true;
  }
}
