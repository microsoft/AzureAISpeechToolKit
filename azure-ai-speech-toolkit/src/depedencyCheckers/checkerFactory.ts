import { IDependencyChecker } from './checkers/iDependencyChecker';
import { PythonChecker } from './checkers/pythonChecker';
import { NodeChecker } from './checkers/nodeChecker';
import { JavaChecker } from './checkers/javaChecker';
import { DotNetChecker } from './checkers/dotNetChecker';
import { DependencyType } from './checkers/iDependencyChecker';


export class CheckerFactory {
    public static createChecker(language: DependencyType): IDependencyChecker {
        switch (language) {
            case DependencyType.Python:
                return new PythonChecker();
            case DependencyType.Node:
                return new NodeChecker();
            case DependencyType.Java:
                return new JavaChecker();
            case DependencyType.DotNet:
                return new DotNetChecker();
            default:
                throw new Error('Unsupported language');
        }
    }
}