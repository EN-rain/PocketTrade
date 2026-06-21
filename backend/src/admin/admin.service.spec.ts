import { AdminService } from './admin.service';

describe('AdminService response safety', () => {
  it('never selects password hashes in listing detail responses', async () => {
    const prisma = {
      listing: {
        findUnique: jest.fn().mockResolvedValue({ id: 11 }),
      },
    } as any;
    const service = new AdminService(prisma, {} as any, {} as any);

    await service.getListing(11);

    const sellerSelect = prisma.listing.findUnique.mock.calls[0][0].include.seller.select;
    expect(sellerSelect.passwordHash).toBeUndefined();
    expect(sellerSelect.tokenVersion).toBeUndefined();
    expect(sellerSelect.email).toBe(true);
  });
});
