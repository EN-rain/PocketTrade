import { UsersService } from './users.service';

describe('UsersService account security', () => {
  it('uses an explicit safe projection for the current-user response', async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 7 }) },
    } as any;
    const service = new UsersService(prisma, {} as any);

    await service.getById(7);

    const select = prisma.user.findUnique.mock.calls[0][0].select;
    expect(select.passwordHash).toBeUndefined();
    expect(select.tokenVersion).toBeUndefined();
    expect(select.email).toBe(true);
  });

  it('removes marketplace data, revokes sessions, and anonymizes a deleted account', async () => {
    const tx = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 7, role: 'user' }),
        update: jest.fn().mockResolvedValue({
          id: 7,
          accountStatus: 'deleted',
          deletionRequestedAt: new Date(),
        }),
      },
      listing: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      favorite: { deleteMany: jest.fn().mockResolvedValue({ count: 3 }) },
      pushToken: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      revokedRefreshToken: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      blockedUser: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    } as any;
    const service = new UsersService(prisma, {} as any);

    await service.requestDeletion(7);

    expect(tx.listing.updateMany).toHaveBeenCalledWith({
      where: { sellerId: 7 },
      data: { status: 'removed' },
    });
    expect(tx.pushToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 7 },
      data: expect.objectContaining({
        displayName: 'Deleted User',
        accountStatus: 'deleted',
        passwordHash: null,
        profileImage: null,
        tokenVersion: { increment: 1 },
      }),
    }));
    const anonymizedEmail = tx.user.update.mock.calls[0][0].data.email as string;
    expect(anonymizedEmail).toMatch(/^deleted-7-[0-9a-f-]+@deleted\.pockettrade\.local$/);
  });
});
