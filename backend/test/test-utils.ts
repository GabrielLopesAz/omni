import { DataSource } from 'typeorm';

export async function clearDatabaseSafely(dataSource: DataSource, tables: string[]) {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(`FAIL-FAST: NODE_ENV must be "test", got "${process.env.NODE_ENV}"`);
  }
  if (!process.env.DB_NAME || !process.env.DB_NAME.endsWith('test')) {
    throw new Error(`FAIL-FAST: DB_NAME must end with "test", got "${process.env.DB_NAME}"`);
  }

  // Turn off foreign key checks briefly to allow truncating/deleting in any order
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0;');
  
  for (const table of tables) {
    try {
      await dataSource.query(`DELETE FROM \`${table}\``);
    } catch (e: any) {
      // Ignore if table doesn't exist yet
      if (e.code !== 'ER_NO_SUCH_TABLE') {
        throw e;
      }
    }
  }

  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1;');
}
