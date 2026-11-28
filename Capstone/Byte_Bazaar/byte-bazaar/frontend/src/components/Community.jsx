import React, { useState } from "react";
import {
  Avatar,
  PhotoPicker,
  PostPhotos,
  uploadPostPhotos,
} from "./ForumMedia";
import { api } from "../lib/api";
import { forumCategories } from "../lib/taxonomy";
export default function Community({ topics, user, open, run, refresh, busy }) {
  const [board, setBoard] = useState(null),
    [thread, setThread] = useState(null),
    [replies, setReplies] = useState([]),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("activity"),
    [composeKey, setComposeKey] = useState(0);
  const activity = (t) => Date.parse(t.latestActivity || t.createdAt),
    recent = [...topics].sort((a, b) => activity(b) - activity(a));
  const activeThread = thread
    ? topics.find((t) => t.id === thread.id) || thread
    : null;
  const chooseBoard = (category, subcategory) => {
    setBoard({ category, subcategory });
    setThread(null);
    setQuery("");
  };
  const showThread = (t) =>
    run(async () => {
      const rows = await api(`/topics/${t.id}/replies`);
      setReplies(rows);
      setThread(t);
      setBoard({ category: t.category, subcategory: t.subcategory });
      setQuery("");
    });
  const newTopic = () =>
    open({
      type: user ? "topic" : "login",
      category: board?.category,
      subcategory: board?.subcategory,
    });
  const matches = topics
    .filter(
      (t) =>
        (!board ||
          (t.category === board.category &&
            t.subcategory === board.subcategory)) &&
        `${t.title} ${t.body} ${t.author}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "newest"
        ? b.id - a.id
        : sort === "replies"
          ? b.replyCount - a.replyCount
          : activity(b) - activity(a),
    );
  const last = (rows) => [...rows].sort((a, b) => activity(b) - activity(a))[0];
  const date = (value) => new Date(value).toLocaleString();
  return (
    <section className="forum-page">
      <div className="forum-hero">
        <div>
          <span className="eyebrow">BYTE BAZAAR COMMUNITY</span>
          <h1>Talk tech. Build together.</h1>
          <p>
            Get advice, share your setup and help someone find their next
            upgrade.
          </p>
        </div>
        <button onClick={newTopic}>Start a topic +</button>
      </div>
      <div className="forum-toolbar">
        <div className="forum-crumbs">
          <button
            onClick={() => {
              setBoard(null);
              setThread(null);
              setQuery("");
            }}
          >
            Forums
          </button>
          {board && (
            <>
              <span>›</span>
              <button
                onClick={() => {
                  setThread(null);
                  setQuery("");
                }}
              >
                {board.category}
              </button>
              <span>›</span>
              <button
                onClick={() => {
                  setThread(null);
                  setQuery("");
                }}
              >
                {board.subcategory}
              </button>
            </>
          )}
          {thread && (
            <>
              <span>›</span>
              <span>Topic</span>
            </>
          )}
        </div>
        <label className="forum-search">
          <input
            aria-label="Search community"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setThread(null);
            }}
            placeholder={
              board ? "Search this subforum…" : "Search all discussions…"
            }
          />
        </label>
      </div>
      <div className="forum-layout">
        <div className="forum-main">
          {activeThread ? (
            <>
              <button className="back-link" onClick={() => setThread(null)}>
                ← Back to {board.subcategory}
              </button>
              <div className="thread-heading">
                <span className="eyebrow">
                  {board.category} / {board.subcategory}
                </span>
                <h2>{activeThread.title}</h2>
                <p>
                  By {activeThread.author} · {date(activeThread.createdAt)} ·{" "}
                  {replies.length} replies
                </p>
              </div>
              <article className="forum-post">
                <aside>
                  <Avatar
                    userId={activeThread.authorId}
                    username={activeThread.author}
                    version={activeThread.authorAvatarVersion}
                  />
                  <b>{activeThread.author}</b>
                  <small>Topic author</small>
                </aside>
                <div>
                  <small>Posted {date(activeThread.createdAt)}</small>
                  <p>{activeThread.body}</p>
                  <PostPhotos
                    topicId={activeThread.id}
                    authorId={activeThread.authorId}
                    user={user}
                  />
                </div>
              </article>
              {replies.map((r) => (
                <article className="forum-post" key={r.id}>
                  <aside>
                    <Avatar
                      userId={r.authorId}
                      username={r.author}
                      version={r.authorAvatarVersion}
                    />
                    <b>{r.author}</b>
                  </aside>
                  <div>
                    <small>Posted {date(r.createdAt)}</small>
                    <p>{r.body}</p>
                    <PostPhotos
                      topicId={activeThread.id}
                      replyId={r.id}
                      authorId={r.authorId}
                      user={user}
                    />
                  </div>
                </article>
              ))}
              <div className="forum-compose">
                <h3>Join the discussion</h3>
                {user ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget,
                        body = new FormData(form).get("body");
                      run(async () => {
                        const files = Array.from(form.elements.pictures.files);
                        const reply = await api(
                          `/topics/${activeThread.id}/replies`,
                          "POST",
                          { body },
                        );
                        let uploadError;
                        try {
                          await uploadPostPhotos(
                            activeThread.id,
                            reply.id,
                            files,
                          );
                        } catch (err) {
                          uploadError = err;
                        }
                        setReplies(
                          await api(`/topics/${activeThread.id}/replies`),
                        );
                        form.reset();
                        setComposeKey((k) => k + 1);
                        await refresh();
                        if (uploadError)
                          throw Error(
                            "Reply posted. Photos could not be uploaded: " +
                              uploadError.message +
                              ". Use Add photos to this post to retry.",
                          );
                      });
                    }}
                  >
                    <label>
                      Your reply
                      <textarea name="body" required maxLength={255} rows={5} />
                    </label>
                    <PhotoPicker key={composeKey} />
                    <button className="dark" disabled={busy}>
                      {busy ? "Posting…" : "Post reply"}
                    </button>
                  </form>
                ) : (
                  <>
                    <p>Sign in or create an account to reply.</p>
                    <button
                      className="dark"
                      onClick={() => open({ type: "login" })}
                    >
                      Sign in to reply
                    </button>
                  </>
                )}
              </div>
            </>
          ) : board || query ? (
            <>
              <div className="board-heading">
                <div>
                  <button
                    className="back-link"
                    onClick={() => {
                      setBoard(null);
                      setQuery("");
                    }}
                  >
                    ← All forums
                  </button>
                  <h2>{board ? board.subcategory : "Search results"}</h2>
                  <p>
                    {matches.length} topics {query && `matching “${query}”`}
                  </p>
                </div>
                <label>
                  Sort topics
                  <select
                    aria-label="Sort topics"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="activity">Recent activity</option>
                    <option value="newest">Newest topics</option>
                    <option value="replies">Most replies</option>
                  </select>
                </label>
              </div>
              <div className="forum-topic-list">
                <div className="topic-list-label">
                  <span>Discussion</span>
                  <span>Replies</span>
                  <span>Last activity</span>
                </div>
                {matches.map((t) => (
                  <div className="forum-topic-row" key={t.id}>
                    <button
                      className="forum-topic-title"
                      onClick={() => showThread(t)}
                    >
                      <Avatar
                        userId={t.authorId}
                        username={t.author}
                        version={t.authorAvatarVersion}
                        small
                      />
                      <div>
                        <h3>{t.title}</h3>
                        <small>
                          {t.author} · {t.subcategory}
                        </small>
                      </div>
                    </button>
                    <span className="reply-count">{t.replyCount || 0}</span>
                    <div className="last-activity">
                      <b>{t.lastAuthor || t.author}</b>
                      <small>{date(t.latestActivity || t.createdAt)}</small>
                    </div>
                  </div>
                ))}
                {!matches.length && (
                  <div className="catalog-empty">
                    <h3>No topics yet</h3>
                    <p>
                      Start a discussion in this subforum or try another search.
                    </p>
                    <button onClick={newTopic}>Create a topic</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {Object.entries(forumCategories).map(([category, subs]) => (
                <section className="forum-group" key={category}>
                  <h2>{category}</h2>
                  {subs.map((sub) => {
                    const rows = topics.filter(
                        (t) => t.category === category && t.subcategory === sub,
                      ),
                      latest = last(rows);
                    return (
                      <div className="forum-board-row" key={sub}>
                        <span className="board-icon" aria-hidden="true">
                          ▤
                        </span>
                        <div className="board-info">
                          <button onClick={() => chooseBoard(category, sub)}>
                            {sub}
                          </button>
                          <p>
                            {descriptions[sub] ||
                              `Questions, advice and discussions about ${sub.toLowerCase()}.`}
                          </p>
                        </div>
                        <div className="board-count">
                          <b>{rows.length}</b>
                          <small>topics</small>
                          <span>
                            {rows.reduce(
                              (s, t) => s + 1 + (t.replyCount || 0),
                              0,
                            )}{" "}
                            posts
                          </span>
                        </div>
                        <div className="last-activity">
                          {latest ? (
                            <>
                              <button onClick={() => showThread(latest)}>
                                {latest.title}
                              </button>
                              <small>
                                By {latest.lastAuthor || latest.author}
                              </small>
                              <small>
                                {date(
                                  latest.latestActivity || latest.createdAt,
                                )}
                              </small>
                            </>
                          ) : (
                            <small>No discussions yet</small>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </section>
              ))}
            </>
          )}
        </div>
        <aside className="forum-sidebar">
          <section>
            <h3>Community overview</h3>
            <dl>
              <div>
                <dt>Topics</dt>
                <dd>{topics.length}</dd>
              </div>
              <div>
                <dt>Posts</dt>
                <dd>
                  {topics.reduce((s, t) => s + 1 + (t.replyCount || 0), 0)}
                </dd>
              </div>
              <div>
                <dt>Subforums</dt>
                <dd>{Object.values(forumCategories).flat().length}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h3>Recent discussions</h3>
            {recent.slice(0, 5).map((t) => (
              <button
                className="recent-topic"
                key={t.id}
                onClick={() => showThread(t)}
              >
                <b>{t.title}</b>
                <small>
                  {t.subcategory} · {t.replyCount || 0} replies
                </small>
              </button>
            ))}
            {!recent.length && <p>No discussions yet. Be the first to post.</p>}
          </section>
          <section className="community-guidelines">
            <h3>A better place to talk tech</h3>
            <p>
              Be respectful. Choose the right subforum. Share enough detail for
              others to help, and keep personal information private.
            </p>
            <button onClick={newTopic}>Start a topic →</button>
          </section>
        </aside>
      </div>
    </section>
  );
}
const descriptions = {
  "General Discussion": "Everyday tech conversations and questions.",
  Introductions: "New here? Say hello and meet the community.",
  "Tech News": "Discuss launches, industry news and emerging technology.",
  "Site Feedback": "Suggestions, questions and issues with Byte Bazaar.",
  "Build Planning": "Get feedback on your parts list before you build.",
  Troubleshooting: "Diagnose problems and help get systems running again.",
  "Build Logs & Showcases":
    "Document your project and share the finished setup.",
  Programming: "Code, frameworks and advice from fellow developers.",
};
