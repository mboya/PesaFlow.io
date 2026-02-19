export {};

declare global {
  interface GoogleCredentialResponse {
    credential?: string;
    select_by?: string;
  }

  interface GoogleIdConfiguration {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: "popup" | "redirect";
  }

  interface GoogleButtonConfiguration {
    type?: "standard" | "icon";
    theme?: "outline" | "filled_blue" | "filled_black";
    size?: "large" | "medium" | "small";
    text?: "signin_with" | "signup_with" | "continue_with" | "signin";
    shape?: "rectangular" | "pill" | "circle" | "square";
    width?: number | string;
  }

  interface GoogleIdentityApi {
    initialize: (config: GoogleIdConfiguration) => void;
    renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void;
  }

  interface GoogleAccountsApi {
    id: GoogleIdentityApi;
  }

  interface Window {
    google?: {
      accounts?: GoogleAccountsApi;
    };
  }
}
