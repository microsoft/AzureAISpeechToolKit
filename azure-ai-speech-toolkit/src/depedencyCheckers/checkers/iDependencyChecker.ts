export interface IDependencyChecker {
    // Check if the dependency is installed
    isInstalled(): Promise<boolean>;

    // Install the dependency
    install(): Promise<void>;
  }

export enum DependencyType {
    Node = 'node',
    Python = 'python',
    Java = 'java',
    DotNet = 'dotnet'
}