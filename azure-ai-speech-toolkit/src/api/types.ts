
/**
 * Definition of option item in single selection or multiple selection
 */
export interface OptionItem {
    /**
     * unique identifier of the option item in the option list
     */
    id: string;
    /**
     * display name
     */
    label: string;
    /**
     * short description
     */
    description?: string;
    /**
     * detailed description
     */
    detail?: string;
    /**
     * customized user data, which is not displayed
     */
    data?: unknown;
    /**
     * @deprecated CLI display name. CLI will use `cliName` as display name, and use `id` instead if `cliName` is undefined.
     */
    cliName?: string;
    /**
     * group name. If it's set, separator will be rendered on UI between groups.
     */
    groupName?: string;
  
    /**
     * Actions that can be made within the item.
     * @param An array of actions
     * @param `icon` is the icon id of the action item
     * @param `tooltip` is the hint of the action item
     * @param `command` is the command name that will be executed when current action triggered
     */
    buttons?: { iconPath: string; tooltip: string; command: string }[];
  }

  export interface AuthInfo {
    serverUrl: string;
    authName?: string;
    authType?: "apiKey" | "oauth2";
  }
  
  export interface Inputs extends Record<string, any> {
    // platform: Platform;
    projectPath?: string;
    projectId?: string;
    nonInteractive?: boolean;
    correlationId?: string;
    /**
     * whether the caller is triggered by @teams or @office agent
     */
    agent?: "teams" | "office";
    /**
     * Auth info about user selected APIs.
     */
    apiAuthData?: AuthInfo;
  }