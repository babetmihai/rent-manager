import { createTheme } from "@mantine/core"

const dark = [
  "#eeeeee",
  "#bdbdbd",
  "#8a8a8a",
  "#5c5c5c",
  "#3a3a3a",
  "#2a2a2a",
  "#222222",
  "#191919",
  "#141414",
  "#111111"
]

export const theme = createTheme({
  primaryColor: "gray",
  primaryShade: { light: 8, dark: 6 },
  autoContrast: false,
  defaultRadius: "sm",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  fontFamilyMonospace: "ui-monospace, SFMono-Regular, Menlo, monospace",
  headings: {
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    fontWeight: "600"
  },
  cursorType: "pointer",
  colors: {
    dark
  },
  components: {
    Button: {
      defaultProps: {
        size: "sm",
        variant: "filled"
      },
      classNames: {
        root: "button"
      }
    },
    ActionIcon: {
      defaultProps: {
        variant: "subtle",
        color: "gray"
      },
      classNames: {
        root: "action-icon"
      }
    },
    Modal: {
      defaultProps: {
        centered: true,
        radius: "sm"
      },
      classNames: {
        root: "modal",
        inner: "modal-inner",
        content: "modal-content",
        header: "modal-header",
        title: "modal-title",
        body: "modal-body",
        overlay: "modal-overlay",
        close: "modal-close"
      },
      styles: {
        header: {
          background: "var(--color-cs-elevated)"
        },
        content: {
          background: "var(--color-cs-elevated)",
          border: "1px solid var(--color-cs-border)"
        }
      }
    },
    Card: {
      defaultProps: {
        shadow: "none",
        radius: "sm",
        padding: "md",
        withBorder: true
      },
      classNames: {
        root: "card"
      }
    },
    Text: {
      classNames: {
        root: "text"
      }
    },
    TextInput: {
      classNames: {
        root: "text-input",
        label: "text-input-label",
        input: "text-input-field"
      }
    },
    PasswordInput: {
      classNames: {
        root: "password-input",
        label: "password-input-label",
        input: "password-input-field"
      }
    },
    NumberInput: {
      classNames: {
        root: "number-input",
        label: "number-input-label",
        input: "number-input-field",
        controls: "number-input-controls"
      }
    },
    Select: {
      classNames: {
        root: "select",
        label: "select-label",
        input: "select-field"
      }
    },
    FileInput: {
      classNames: {
        root: "file-input",
        label: "file-input-label",
        input: "file-input-field"
      }
    },
    Menu: {
      classNames: {
        dropdown: "menu-dropdown",
        item: "menu-item",
        label: "menu-label"
      }
    },
    SegmentedControl: {
      classNames: {
        root: "segmented-control",
        label: "segmented-control-label",
        control: "segmented-control-control"
      }
    }
  }
})
