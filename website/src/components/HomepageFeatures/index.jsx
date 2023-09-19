import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Command Framework',
    description: (
      <>
        MsgRoom.js has a powerful command system with subcommands, a built-in help command, and more!
      </>
    ),
  },
  {
    title: 'Battle-tested',
    description: (
      <>
        MsgRoom.js is used in production in several bots you know and love, like Yabluzo and SoBot.
      </>
    ),
  },
  {
    title: "Frequent updates",
    description: (
      <>
        This project is in active development and gets frequent updates with improvements and/or bugfixes.
        Issues get found and fixed all the time.
      </>
    )
  },
  {
    title: "Universal",
    description: (
      <>
        MsgRoom.js is truly universal, you can use it for anything!
        Use it to make a bot, a custom client or whatever else you like!
        You don't even have to use the command framework.
        Don't like it? Just listen for messages and use some good old if statements (like SoBot does)!
      </>
    )
  }
];

function Feature({ title, description }) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
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
