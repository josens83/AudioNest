'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CATEGORIES } from '@audionest/types';

const categoryList = Object.entries(CATEGORIES).map(([key, value]) => ({
  id: key,
  ...value,
}));

export function CategorySection() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          📚 카테고리
        </h2>
        <Link href="/categories">
          <Button variant="ghost" size="sm">
            전체 보기
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
        {categoryList.slice(0, 14).map((category) => (
          <Link key={category.id} href={`/category/${category.id}`}>
            <Card
              className="p-4 flex flex-col items-center gap-2 hover:bg-muted/50 transition-colors cursor-pointer group"
              style={{
                borderColor: category.color + '30',
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-transform group-hover:scale-110"
                style={{
                  backgroundColor: category.color + '20',
                }}
              >
                {category.icon}
              </div>
              <span className="text-xs font-medium text-center">
                {category.name}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
