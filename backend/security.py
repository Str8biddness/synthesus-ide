"""
Security Hardening Module for SYNTHESUS IDE
Provides sandboxed code execution with restrictions and monitoring.
"""

import os
import re
import ast
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import List, Set, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

@dataclass
class ExecutionConfig:
    """Configuration for code execution sandbox"""
    max_execution_time: int = 60
    max_output_size: int = 10 * 1024 * 1024  # 10MB
    max_memory_mb: int = 512
    max_processes: int = 10
    allow_network: bool = False
    allow_file_write: bool = True
    blocked_modules: Set[str] = None
    blocked_functions: Set[str] = None
    
    def __post_init__(self):
        if self.blocked_modules is None:
            self.blocked_modules = {
                'os', 'sys', 'subprocess', 'socket', 'http',
                'urllib', 'ftplib', 'smtplib', 'telnetlib',
                'popen2', 'commands', 'socketserver', 'BaseHTTPServer'
            }
        if self.blocked_functions is None:
            self.blocked_functions = {
                'eval', 'exec', '__import__', 'compile', 'open',
                'input', 'raw_input', 'execfile', 'reload'
            }


class CodeSecurityScanner:
    """Scan code for potentially dangerous operations"""
    
    DANGEROUS_PATTERNS = [
        # File system operations
        (r'import\s+os\s*;', 'OS module import'),
        (r'import\s+subprocess', 'Subprocess import'),
        (r'os\.system\s*\(', 'System command execution'),
        (r'subprocess\.', 'Subprocess calls'),
        (r'__import__\s*\(', 'Dynamic import'),
        (r'eval\s*\(', 'Eval usage'),
        (r'exec\s*\(', 'Exec usage'),
        (r'compile\s*\(', 'Compile usage'),
        # Network operations
        (r'socket\.', 'Socket operations'),
        (r'urllib', 'URL operations'),
        (r'requests\.', 'HTTP requests'),
        # File operations that might be dangerous
        (r'open\s*\([^)]*[,\s]*["\']w', 'File write operations'),
        (r'shutil\.', 'Shutil operations'),
        (r'pathlib\.', 'Pathlib operations'),
        # Shell escapes
        (r'`[^`]+`', 'Backtick execution'),
        (r'\$\([^)]+\)', 'Command substitution'),
        # JavaScript specific
        (r'child_process', 'Node child_process'),
        (r'require\s*\(\s*["\']fs["\']\s*\)', 'Node FS module'),
        (r'Reflect\.apply', 'Reflect API'),
        (r'Function\s*\(', 'Dynamic function constructor'),
    ]
    
    @classmethod
    def scan_code(cls, code: str, language: str) -> List[Dict[str, Any]]:
        """
        Scan code for potentially dangerous patterns.
        Returns list of warnings found.
        """
        warnings = []
        
        for pattern, description in cls.DANGEROUS_PATTERNS:
            matches = re.finditer(pattern, code, re.IGNORECASE)
            for match in matches:
                line_num = code[:match.start()].count('\n') + 1
                warnings.append({
                    'line': line_num,
                    'pattern': pattern,
                    'description': description,
                    'severity': 'warning'
                })
        
        # Language-specific checks
        if language == 'python':
            warnings.extend(cls._check_python_ast(code))
        elif language == 'javascript':
            warnings.extend(cls._check_javascript(code))
        
        return warnings
    
    @classmethod
    def _check_python_ast(cls, code: str) -> List[Dict[str, Any]]:
        """Check Python code using AST analysis"""
        warnings = []
        
        try:
            tree = ast.parse(code)
            
            for node in ast.walk(tree):
                # Check for dangerous imports
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if alias.name in {'os', 'subprocess', 'socket', 'sys'}:
                            warnings.append({
                                'line': getattr(node, 'lineno', 0),
                                'description': f'Dangerous import: {alias.name}',
                                'severity': 'warning'
                            })
                
                # Check for eval/exec
                if isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name):
                        if node.func.id in {'eval', 'exec', '__import__'}:
                            warnings.append({
                                'line': getattr(node, 'lineno', 0),
                                'description': f'Dangerous function call: {node.func.id}()',
                                'severity': 'error'
                            })
        except SyntaxError as e:
            warnings.append({
                'line': e.lineno or 0,
                'description': f'Syntax error: {e.msg}',
                'severity': 'error'
            })
        
        return warnings
    
    @classmethod
    def _check_javascript(cls, code: str) -> List[Dict[str, Any]]:
        """Basic JavaScript security checks"""
        warnings = []
        
        # Check for child_process
        if 'child_process' in code:
            warnings.append({
                'line': code.find('child_process'),
                'description': 'Use of child_process module',
                'severity': 'warning'
            })
        
        return warnings


class SandboxedExecutor:
    """Execute code in a sandboxed environment with security restrictions"""
    
    def __init__(self, config: ExecutionConfig = None):
        self.config = config or ExecutionConfig()
    
    def execute_python(self, code: str, workspace_dir: Path) -> Dict[str, Any]:
        """Execute Python code with security restrictions"""
        # Pre-execution security scan
        warnings = CodeSecurityScanner.scan_code(code, 'python')
        errors = [w for w in warnings if w['severity'] == 'error']
        
        if errors:
            return {
                'success': False,
                'output': '',
                'error': f'Security violations: {[e["description"] for e in errors]}',
                'warnings': warnings,
                'execution_time': 0
            }
        
        # Create isolated temp file
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.py',
            dir=workspace_dir,
            delete=False
        ) as f:
            # Add security wrapper
            wrapped_code = self._wrap_python_code(code)
            f.write(wrapped_code)
            temp_path = f.name
        
        try:
            # Execute with resource limits
            start_time = datetime.now()
            
            result = subprocess.run(
                [self._get_python_executable(), temp_path],
                capture_output=True,
                text=True,
                timeout=self.config.max_execution_time,
                cwd=str(workspace_dir),
                # Limit environment
                env=self._get_restricted_env(),
                # Resource limits could be set here with ulimit on Unix
            )
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            # Check output size
            output = result.stdout
            if len(output) > self.config.max_output_size:
                output = output[:self.config.max_output_size] + '\n... [Output truncated]'
            
            return {
                'success': result.returncode == 0,
                'output': output,
                'error': result.stderr if result.stderr else None,
                'warnings': warnings,
                'execution_time': execution_time
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': f'Execution timed out after {self.config.max_execution_time} seconds',
                'warnings': warnings,
                'execution_time': self.config.max_execution_time
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e),
                'warnings': warnings,
                'execution_time': 0
            }
        finally:
            # Cleanup
            try:
                os.unlink(temp_path)
            except:
                pass
    
    def execute_javascript(self, code: str, workspace_dir: Path) -> Dict[str, Any]:
        """Execute JavaScript code with security restrictions"""
        warnings = CodeSecurityScanner.scan_code(code, 'javascript')
        errors = [w for w in warnings if w['severity'] == 'error']
        
        if errors:
            return {
                'success': False,
                'output': '',
                'error': f'Security violations: {[e["description"] for e in errors]}',
                'warnings': warnings,
                'execution_time': 0
            }
        
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.js',
            dir=workspace_dir,
            delete=False
        ) as f:
            # Add security wrapper
            wrapped_code = self._wrap_javascript_code(code)
            f.write(wrapped_code)
            temp_path = f.name
        
        try:
            start_time = datetime.now()
            
            result = subprocess.run(
                ['node', temp_path],
                capture_output=True,
                text=True,
                timeout=self.config.max_execution_time,
                cwd=str(workspace_dir),
                env=self._get_restricted_env()
            )
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            output = result.stdout
            if len(output) > self.config.max_output_size:
                output = output[:self.config.max_output_size] + '\n... [Output truncated]'
            
            return {
                'success': result.returncode == 0,
                'output': output,
                'error': result.stderr if result.stderr else None,
                'warnings': warnings,
                'execution_time': execution_time
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': f'Execution timed out after {self.config.max_execution_time} seconds',
                'warnings': warnings,
                'execution_time': self.config.max_execution_time
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e),
                'warnings': warnings,
                'execution_time': 0
            }
        finally:
            try:
                os.unlink(temp_path)
            except:
                pass
    
    def execute_shell(self, command: str, workspace_dir: Path) -> Dict[str, Any]:
        """Execute shell command with restrictions"""
        # Block dangerous commands
        blocked_commands = [
            'rm -rf /', 'rm -rf /*', 'mkfs', 'dd if=/dev/zero',
            '> /dev/sda', 'curl.*|.*sh', 'wget.*|.*sh',
            ':(){ :|: & };:', 'chmod 777 /', 'chown -R',
            'sudo', 'su -', 'passwd', 'usermod'
        ]
        
        cmd_lower = command.lower()
        for blocked in blocked_commands:
            if re.search(blocked, cmd_lower):
                return {
                    'success': False,
                    'stdout': '',
                    'stderr': f'Command blocked for security: {blocked}',
                    'return_code': -1
                }
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=self.config.max_execution_time,
                cwd=str(workspace_dir),
                env=self._get_restricted_env()
            )
            
            return {
                'success': result.returncode == 0,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'return_code': result.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'stdout': '',
                'stderr': f'Command timed out after {self.config.max_execution_time} seconds',
                'return_code': -1
            }
        except Exception as e:
            return {
                'success': False,
                'stdout': '',
                'stderr': str(e),
                'return_code': -1
            }
    
    def _wrap_python_code(self, code: str) -> str:
        """Wrap Python code with security restrictions"""
        wrapper = f'''
import sys
import builtins

# Restrict builtins
restricted_builtins = {{}}
allowed_builtins = ['abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'bytes',
    'chr', 'complex', 'dict', 'dir', 'divmod', 'enumerate', 'filter', 'float',
    'format', 'frozenset', 'hasattr', 'hash', 'hex', 'id', 'int', 'isinstance',
    'issubclass', 'iter', 'len', 'list', 'map', 'max', 'memoryview', 'min',
    'next', 'oct', 'ord', 'pow', 'print', 'range', 'repr', 'reversed', 'round',
    'set', 'slice', 'sorted', 'str', 'sum', 'tuple', 'type', 'vars', 'zip',
    'True', 'False', 'None', 'Exception', 'BaseException'
]

for name in allowed_builtins:
    if hasattr(builtins, name):
        restricted_builtins[name] = getattr(builtins, name)

# Replace builtins
old_builtins = builtins.__dict__.copy()
builtins.__dict__.clear()
builtins.__dict__.update(restricted_builtins)

try:
{chr(10).join('    ' + line for line in code.split(chr(10)))}
except Exception as e:
    print(f"Error: {{e}}", file=sys.stderr)
    sys.exit(1)
finally:
    builtins.__dict__.clear()
    builtins.__dict__.update(old_builtins)
'''
        return wrapper
    
    def _wrap_javascript_code(self, code: str) -> str:
        """Wrap JavaScript code with security restrictions"""
        wrapper = f'''
// Disable dangerous globals
delete global.require;
delete global.process;
delete global.Buffer;

// Override console to prevent excessive output
const originalLog = console.log;
let logCount = 0;
const MAX_LOGS = 1000;
console.log = function(...args) {{
    if (logCount < MAX_LOGS) {{
        originalLog.apply(console, args);
        logCount++;
    }} else if (logCount === MAX_LOGS) {{
        originalLog('[Log limit reached]');
        logCount++;
    }}
}};

try {{
{code}
}} catch (e) {{
    console.error('Error:', e.message);
    process.exit(1);
}}
'''
        return wrapper
    
    def _get_restricted_env(self) -> Dict[str, str]:
        """Get restricted environment variables"""
        env = os.environ.copy()
        # Remove sensitive environment variables
        sensitive_vars = [
            'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY',
            'AZURE_CLIENT_SECRET', 'GOOGLE_APPLICATION_CREDENTIALS',
            'MONGO_URL', 'JWT_SECRET', 'DATABASE_URL'
        ]
        for var in sensitive_vars:
            env.pop(var, None)
        
        # Set restricted PATH
        env['PATH'] = '/usr/local/bin:/usr/bin:/bin'
        
        return env
    
    def _get_python_executable(self) -> str:
        """Get Python executable path"""
        return sys.executable


# Global executor instance
sandbox_executor = SandboxedExecutor()
