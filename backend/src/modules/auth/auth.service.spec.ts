import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity.js';
import * as bcrypt from 'bcrypt';

describe('AuthService (Segurança)', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockUsuarioRepo = {
    findOne: vi.fn(),
  };

  const mockJwtService = {
    sign: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Usuario), useValue: mockUsuarioRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('deve validar o usuário com senha correta via bcrypt e não retornar a hash', async () => {
    const senhaPlana = 'minhasenha123';
    const hash = await bcrypt.hash(senhaPlana, 10);
    
    mockUsuarioRepo.findOne.mockResolvedValue({
      id: 'usr-1',
      email: 'teste@teste.com',
      senhaHash: hash,
      ativo: true,
      role: { nome: 'ADMIN' },
    });

    const user = await service.validateUser('teste@teste.com', senhaPlana);
    
    expect(user).toBeDefined();
    expect(user?.senhaHash).toBeUndefined(); // A hash não pode vazar!
    expect(user?.id).toBe('usr-1');
  });

  it('deve retornar null para senha incorreta (Proteção Brute Force/Acesso Indevido)', async () => {
    const hash = await bcrypt.hash('senha_certa', 10);
    
    mockUsuarioRepo.findOne.mockResolvedValue({
      id: 'usr-1',
      email: 'teste@teste.com',
      senhaHash: hash,
      ativo: true,
    });

    const user = await service.validateUser('teste@teste.com', 'senha_errada');
    expect(user).toBeNull();
  });

  it('deve embutir as Roles no payload do JWT (RBAC)', async () => {
    const fakeUser = {
      id: 'usr-1',
      email: 'teste@teste.com',
      role: { nome: 'CONFERENTE' },
      empresa: { id: 'emp-1' }
    };

    mockJwtService.sign.mockReturnValue('fake.jwt.token');

    const result = await service.login(fakeUser);
    
    expect(mockJwtService.sign).toHaveBeenCalledWith({
      email: 'teste@teste.com',
      sub: 'usr-1',
      role: 'CONFERENTE',
      empresaId: 'emp-1'
    });
    expect(result.access_token).toBe('fake.jwt.token');
  });
});
