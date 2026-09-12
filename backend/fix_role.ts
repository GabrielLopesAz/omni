import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Usuario } from './src/modules/usuarios/entities/usuario.entity.js';
import { Role } from './src/modules/usuarios/entities/role.entity.js';
import { Empresa } from './src/modules/empresas/entities/empresa.entity.js';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: '',
  database: 'omni',
  entities: [Usuario, Role, Empresa],
});

async function run() {
  await AppDataSource.initialize();
  
  // Encontrar role ADMIN
  const roleAdmin = await AppDataSource.getRepository(Role).findOne({ where: { nome: 'ADMIN' } });
  
  if (roleAdmin) {
    const adminUser = await AppDataSource.getRepository(Usuario).findOne({ where: { email: 'admin@omni.com' } });
    if (adminUser) {
      adminUser.role = roleAdmin;
      await AppDataSource.getRepository(Usuario).save(adminUser);
      console.log('Role ADMIN vinculada ao admin@omni.com com sucesso!');
    } else {
      console.log('Usuario admin@omni.com não encontrado');
    }
  } else {
    console.log('Role ADMIN não encontrada');
  }

  await AppDataSource.destroy();
}

run().catch(console.error);
