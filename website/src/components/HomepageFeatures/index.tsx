import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  emoji: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'AI 学业规划',
    emoji: '🎯',
    description: (
      <>
        垂直 IT 赛道的生涯路线设计、里程碑规划与动态调整,依据学情与时间精力量身定制动态学习规划。
      </>
    ),
  },
  {
    title: '情绪陪伴',
    emoji: '💬',
    description: (
      <>
        学习过程中的情绪疏导、动力干预与成长激励,消解学习过程的孤独感,支撑长期坚持。
      </>
    ),
  },
  {
    title: '技能实训',
    emoji: '🛠️',
    description: (
      <>
        IT 方向课内学习、刷题、项目实战等落地练习场景,让成长不止于知识辅导。
      </>
    ),
  },
];

function Feature({title, emoji, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <span style={{fontSize: '4rem'}} role="img" aria-label={title}>
          {emoji}
        </span>
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
