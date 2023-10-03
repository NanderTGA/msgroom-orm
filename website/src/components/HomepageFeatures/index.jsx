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
        MsgRoom.js is used in production in several bots you know and love, like Yabluzo.
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
        MsgRoom.js is truly universal, you can use it for whatever you like!
        Make a bot, a custom client or whatever else you can think of!
      </>
    )
  },
  {
    title: "Documentation",
    description: (
      <>
        MsgRoom.js is the only library of its kind that has up-to-date documentation and extensive API docs.
      </>
    )
  },
  {
    title: "Long-standing",
    description: (
      <>
        This project has been around longer than any others, and as a result it has matured the most compared to others.
        We know what we're doing... I guess... hehe
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
