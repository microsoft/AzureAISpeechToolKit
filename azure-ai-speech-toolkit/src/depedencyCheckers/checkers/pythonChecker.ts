import { IDependencyChecker } from "./iDependencyChecker";

export class PythonChecker implements IDependencyChecker {
    public async isInstalled(): Promise<boolean> {
        try {
            // await execa('python', ['--version']);
            return true;
        } catch (error) {
            return false;
        }
    }

    public async install(): Promise<void> {
        // await execa('brew', ['install', 'python']);
    }
}