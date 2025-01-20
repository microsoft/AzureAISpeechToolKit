import { IDependencyChecker } from "./iDependencyChecker";

export class NodeChecker implements IDependencyChecker {
    public async isInstalled(): Promise<boolean> {
        try {
            // await execa('dotnet', ['--version']);
            return true;
        } catch (error) {
            return false;
        }
    }

    public async install(): Promise<void> {
        // await execa('brew', ['install', 'dotnet']);
    }
}