import { DependencyType } from "./checkers/iDependencyChecker";
import { CheckerFactory } from "./checkerFactory";

export class DependencyManager {
    public static async ensureDependency(dependencyType : DependencyType) {
        const checker = CheckerFactory.createChecker(dependencyType);
        const isInstalled = await checker.isInstalled();
        if (!isInstalled) {
            await checker.install();
        } else {
            console.log(`Dependency ${dependencyType} is already installed`);
        }
    }
}