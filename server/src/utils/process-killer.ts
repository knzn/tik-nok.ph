import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function killProcessOnPort(port: number): Promise<void> {
  try {
    const platform = process.platform;
    
    if (platform === 'win32') {
      // Windows
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      const lines = stdout.split('\n');
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid) {
          await execAsync(`taskkill /F /PID ${pid}`);
        }
      }
    } else {
      // Unix-like systems
      const { stdout } = await execAsync(`lsof -i :${port} -t`);
      const pids = stdout.trim().split('\n');
      for (const pid of pids) {
        if (pid) {
          await execAsync(`kill -9 ${pid}`);
        }
      }
    }
  } catch (error) {
    console.error(`Failed to kill process on port ${port}:`, error);
  }
} 