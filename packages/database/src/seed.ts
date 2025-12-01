import { PrismaClient, Category, ContentType, AccessType, AlbumStatus, EpisodeAccessType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create achievements
  const achievements = await Promise.all([
    prisma.achievement.upsert({
      where: { id: 'first_listen' },
      update: {},
      create: {
        id: 'first_listen',
        name: '첫 발걸음',
        description: '첫 에피소드 청취',
        icon: '🎧',
        type: 'LISTEN_TIME',
        requirement: 1,
        coinReward: 10,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'hour_1' },
      update: {},
      create: {
        id: 'hour_1',
        name: '1시간 청취',
        description: '누적 1시간 청취',
        icon: '⏱️',
        type: 'LISTEN_TIME',
        requirement: 60,
        coinReward: 20,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'hour_10' },
      update: {},
      create: {
        id: 'hour_10',
        name: '10시간 청취',
        description: '누적 10시간 청취',
        icon: '🌟',
        type: 'LISTEN_TIME',
        requirement: 600,
        coinReward: 50,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'hour_100' },
      update: {},
      create: {
        id: 'hour_100',
        name: '100시간 청취',
        description: '누적 100시간 청취',
        icon: '🏆',
        type: 'LISTEN_TIME',
        requirement: 6000,
        coinReward: 200,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'book_1' },
      update: {},
      create: {
        id: 'book_1',
        name: '첫 완독',
        description: '오디오북 1권 완료',
        icon: '📚',
        type: 'BOOKS_COMPLETED',
        requirement: 1,
        coinReward: 50,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'streak_7' },
      update: {},
      create: {
        id: 'streak_7',
        name: '1주 연속',
        description: '7일 연속 청취',
        icon: '🔥',
        type: 'STREAK',
        requirement: 7,
        coinReward: 50,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'streak_30' },
      update: {},
      create: {
        id: 'streak_30',
        name: '1달 연속',
        description: '30일 연속 청취',
        icon: '💎',
        type: 'STREAK',
        requirement: 30,
        coinReward: 200,
      },
    }),
  ]);

  console.log(`✅ Created ${achievements.length} achievements`);

  // Create live gifts
  const gifts = await Promise.all([
    prisma.liveGift.upsert({
      where: { id: 'heart' },
      update: {},
      create: {
        id: 'heart',
        name: '하트',
        icon: '❤️',
        coinCost: 1,
        hostReceives: 0,
        sortOrder: 1,
      },
    }),
    prisma.liveGift.upsert({
      where: { id: 'coffee' },
      update: {},
      create: {
        id: 'coffee',
        name: '커피',
        icon: '☕',
        coinCost: 10,
        hostReceives: 5,
        sortOrder: 2,
      },
    }),
    prisma.liveGift.upsert({
      where: { id: 'mic' },
      update: {},
      create: {
        id: 'mic',
        name: '마이크',
        icon: '🎤',
        coinCost: 50,
        hostReceives: 25,
        sortOrder: 3,
      },
    }),
    prisma.liveGift.upsert({
      where: { id: 'headphone' },
      update: {},
      create: {
        id: 'headphone',
        name: '헤드폰',
        icon: '🎧',
        coinCost: 100,
        hostReceives: 50,
        sortOrder: 4,
      },
    }),
    prisma.liveGift.upsert({
      where: { id: 'star' },
      update: {},
      create: {
        id: 'star',
        name: '별',
        icon: '⭐',
        coinCost: 500,
        hostReceives: 250,
        sortOrder: 5,
      },
    }),
    prisma.liveGift.upsert({
      where: { id: 'rocket' },
      update: {},
      create: {
        id: 'rocket',
        name: '로켓',
        icon: '🚀',
        coinCost: 1000,
        hostReceives: 500,
        sortOrder: 6,
      },
    }),
    prisma.liveGift.upsert({
      where: { id: 'crown' },
      update: {},
      create: {
        id: 'crown',
        name: '왕관',
        icon: '👑',
        coinCost: 5000,
        hostReceives: 2500,
        sortOrder: 7,
      },
    }),
  ]);

  console.log(`✅ Created ${gifts.length} live gifts`);

  // Create sample user
  const sampleUser = await prisma.user.upsert({
    where: { email: 'demo@audionest.com' },
    update: {},
    create: {
      email: 'demo@audionest.com',
      username: 'demo_user',
      subscription: 'VIP',
      subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      coins: 100,
    },
  });

  console.log(`✅ Created sample user: ${sampleUser.email}`);

  // Create sample creator
  const sampleCreator = await prisma.creator.upsert({
    where: { userId: sampleUser.id },
    update: {},
    create: {
      userId: sampleUser.id,
      name: '오디오 크리에이터',
      displayName: 'AudioCreator',
      bio: '오디오북과 팟캐스트를 제작하는 전문 크리에이터입니다.',
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  console.log(`✅ Created sample creator: ${sampleCreator.name}`);

  // Create sample albums
  const albums = await Promise.all([
    prisma.album.create({
      data: {
        title: '부의 추월차선',
        subtitle: 'The Millionaire Fastlane',
        description: '30대에 은퇴한 저자가 알려주는 패스트레인 전략. 부자가 되는 진짜 비밀을 공개합니다.',
        coverUrl: 'https://picsum.photos/seed/album1/400/400',
        category: Category.AUDIOBOOK_BUSINESS,
        tags: ['자기계발', '경제', '투자', '부자'],
        creatorId: sampleCreator.id,
        contentType: ContentType.AUDIOBOOK,
        totalEpisodes: 52,
        totalDuration: 88200, // 24.5 hours
        accessType: AccessType.FREEMIUM,
        price: 19900,
        playCount: 125000,
        subscriberCount: 8500,
        likeCount: 12000,
        rating: 4.9,
        ratingCount: 2345,
        status: AlbumStatus.COMPLETED,
        isFeatured: true,
        bookInfo: {
          author: 'MJ 드마코',
          publisher: '토트',
          isbn: '9788997114102',
        },
      },
    }),
    prisma.album.create({
      data: {
        title: '역행자',
        subtitle: '돈, 시간, 운명으로부터 자유로워지는 법',
        description: '월급쟁이에서 억대 연봉자로, 평범한 사람이 인생을 역행하는 방법.',
        coverUrl: 'https://picsum.photos/seed/album2/400/400',
        category: Category.AUDIOBOOK_SELFHELP,
        tags: ['자기계발', '성공', '마인드셋'],
        creatorId: sampleCreator.id,
        contentType: ContentType.AUDIOBOOK,
        totalEpisodes: 35,
        totalDuration: 54000, // 15 hours
        accessType: AccessType.FREEMIUM,
        price: 17900,
        playCount: 98000,
        subscriberCount: 6200,
        likeCount: 8900,
        rating: 4.8,
        ratingCount: 1890,
        status: AlbumStatus.COMPLETED,
        isFeatured: true,
        bookInfo: {
          author: '자청',
          publisher: '웅진지식하우스',
        },
      },
    }),
    prisma.album.create({
      data: {
        title: '손석희의 앵커브리핑',
        description: '대한민국 대표 앵커 손석희의 시사 분석 팟캐스트',
        coverUrl: 'https://picsum.photos/seed/album3/400/400',
        category: Category.PODCAST_NEWS,
        tags: ['시사', '뉴스', '정치', '사회'],
        creatorId: sampleCreator.id,
        contentType: ContentType.PODCAST,
        totalEpisodes: 120,
        totalDuration: 43200, // 12 hours
        accessType: AccessType.FREE,
        playCount: 250000,
        subscriberCount: 15000,
        likeCount: 22000,
        rating: 4.8,
        ratingCount: 3200,
        status: AlbumStatus.ONGOING,
        updateFrequency: '매주 월/수/금',
        isFeatured: true,
      },
    }),
    prisma.album.create({
      data: {
        title: '숙면 ASMR',
        subtitle: '깊은 잠을 위한 소리 테라피',
        description: '스트레스 해소와 깊은 수면을 위한 ASMR 콘텐츠',
        coverUrl: 'https://picsum.photos/seed/album4/400/400',
        category: Category.ASMR,
        tags: ['ASMR', '수면', '휴식', '명상'],
        creatorId: sampleCreator.id,
        contentType: ContentType.ASMR,
        totalEpisodes: 50,
        totalDuration: 180000, // 50 hours
        accessType: AccessType.VIP,
        playCount: 180000,
        subscriberCount: 12000,
        likeCount: 15000,
        rating: 4.9,
        ratingCount: 2800,
        status: AlbumStatus.ONGOING,
        isExclusive: true,
      },
    }),
    prisma.album.create({
      data: {
        title: '영어회화 30일 완성',
        subtitle: '원어민처럼 말하는 비법',
        description: '30일만에 영어 스피킹 실력을 향상시키는 체계적인 강의',
        coverUrl: 'https://picsum.photos/seed/album5/400/400',
        category: Category.COURSE_LANGUAGE,
        tags: ['영어', '회화', '어학', '학습'],
        creatorId: sampleCreator.id,
        contentType: ContentType.COURSE,
        totalEpisodes: 30,
        totalDuration: 54000, // 15 hours
        accessType: AccessType.PAID,
        price: 99000,
        coinPrice: 1000,
        playCount: 45000,
        subscriberCount: 3200,
        likeCount: 4500,
        rating: 4.7,
        ratingCount: 890,
        status: AlbumStatus.COMPLETED,
      },
    }),
  ]);

  console.log(`✅ Created ${albums.length} sample albums`);

  // Create sample episodes for first album
  const episodesData = [
    { title: '프롤로그 - 왜 부자가 되지 못하는가', duration: 1935, accessType: EpisodeAccessType.FREE },
    { title: '부자의 3가지 길', duration: 2720, accessType: EpisodeAccessType.FREE },
    { title: '인도 - 가난한 자의 길', duration: 2325, accessType: EpisodeAccessType.VIP },
    { title: '서행차선 - 느린 부자의 길', duration: 2580, accessType: EpisodeAccessType.VIP },
    { title: '패스트레인 - 빠른 부자의 길', duration: 2890, accessType: EpisodeAccessType.VIP },
    { title: '부의 공식', duration: 2150, accessType: EpisodeAccessType.VIP },
    { title: '통제 가능한 무제한 영향력', duration: 2430, accessType: EpisodeAccessType.VIP },
    { title: '사업의 5가지 계명 (1)', duration: 2670, accessType: EpisodeAccessType.VIP },
    { title: '사업의 5가지 계명 (2)', duration: 2540, accessType: EpisodeAccessType.VIP },
    { title: '패스트레인 실천 전략', duration: 2890, accessType: EpisodeAccessType.VIP },
  ];

  const episodes = await Promise.all(
    episodesData.map((ep, index) =>
      prisma.episode.create({
        data: {
          albumId: albums[0].id,
          number: index + 1,
          title: ep.title,
          description: `${albums[0].title}의 ${index + 1}화입니다.`,
          audioUrl: `https://example.com/audio/${albums[0].id}/${index + 1}.m3u8`,
          duration: ep.duration,
          fileSize: BigInt(ep.duration * 16000), // ~128kbps
          accessType: ep.accessType,
          previewDuration: ep.accessType !== EpisodeAccessType.FREE ? 60 : undefined,
          playCount: Math.floor(Math.random() * 50000) + 10000,
          likeCount: Math.floor(Math.random() * 5000) + 1000,
        },
      })
    )
  );

  console.log(`✅ Created ${episodes.length} sample episodes`);

  console.log('\n🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
