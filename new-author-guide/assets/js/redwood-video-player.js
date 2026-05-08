(function () {
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function toArray(value, separator) {
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }

    return String(value || "")
      .split(separator || "|")
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
  }

  function parseTranscript(raw, options) {
    var parsed = String(raw || "")
      .split("||")
      .map(function (entry) {
        var parts = entry.split("::");

        return {
          time: (parts.shift() || "").trim(),
          text: parts.join("::").trim()
        };
      })
      .filter(function (entry) {
        return entry.time && entry.text;
      });

    if (parsed.length) {
      return parsed;
    }

    return defaultTranscript(options);
  }

  function defaultTranscript(options) {
    var slots = ["00:00", "00:12", "00:24", "00:36"];
    var features = (options.features || []).slice(0, 4);

    if (!features.length) {
      features = ["Intro", "Setup", "Build", "Validate"];
    }

    return features.map(function (feature, index) {
      var label = feature.toLowerCase();
      return {
        time: slots[index] || "00:48",
        text: "Demo clip: " + label + " walkthrough and expected output state."
      };
    });
  }

  function defaultAssetConfig() {
    var path = String(window.location.pathname || "").replace(/\\/g, "/");

    if (
      path.indexOf("/sample-workshops/clinical-first-responder-rag/") !== -1 ||
      /\/sample-workshops\/clinical-first-responder-rag(?:\/index\.html)?$/.test(path)
    ) {
      return {
        src: "./media/psychiatry-template.mp4",
        captions: "./media/psychiatry-template.vtt"
      };
    }

    return {
      src: "./assets/media/guide/author-guide-template.mp4",
      captions: "./assets/media/guide/author-guide-template.vtt"
    };
  }

  function readOptions(node) {
    var fallback = defaultAssetConfig();

    return {
      title: node.getAttribute("data-video-title") || "Section walkthrough",
      summary: node.getAttribute("data-video-summary") || "Use this space for the recorded walkthrough.",
      kicker: node.getAttribute("data-video-kicker") || "Video walkthrough",
      src: node.getAttribute("data-video-src") || fallback.src,
      captions: node.getAttribute("data-video-captions") || fallback.captions,
      features: toArray(node.getAttribute("data-video-features"), "|"),
      transcriptTitle: node.getAttribute("data-video-transcript-title") || "Transcript",
      transcriptIntro: node.getAttribute("data-video-transcript-intro") || "Use the transcript to review the demo clip and confirm the player behavior without relying on audio.",
      transcript: parseTranscript(node.getAttribute("data-video-transcript"), {
        features: toArray(node.getAttribute("data-video-features"), "|")
      }),
      autoplay: node.getAttribute("data-video-autoplay") !== "false",
      loop: node.getAttribute("data-video-loop") !== "false"
    };
  }

  function formatTime(seconds) {
    var value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
    var mins = Math.floor(value / 60);
    var secs = value % 60;
    return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  }

  function createMountMarkup(options) {
    var features = toArray(options.features || [], "|");
    var transcript = Array.isArray(options.transcript)
      ? options.transcript.map(function (entry) {
          return (entry.time || "") + "::" + (entry.text || "");
        }).join("||")
      : String(options.transcript || "");

    return [
      '<div data-video-card',
      options.title ? ' data-video-title="' + escapeAttribute(options.title) + '"' : "",
      options.summary ? ' data-video-summary="' + escapeAttribute(options.summary) + '"' : "",
      options.kicker ? ' data-video-kicker="' + escapeAttribute(options.kicker) + '"' : "",
      options.src ? ' data-video-src="' + escapeAttribute(options.src) + '"' : "",
      options.captions ? ' data-video-captions="' + escapeAttribute(options.captions) + '"' : "",
      features.length ? ' data-video-features="' + escapeAttribute(features.join("|")) + '"' : "",
      transcript ? ' data-video-transcript="' + escapeAttribute(transcript) + '"' : "",
      options.transcriptTitle ? ' data-video-transcript-title="' + escapeAttribute(options.transcriptTitle) + '"' : "",
      options.transcriptIntro ? ' data-video-transcript-intro="' + escapeAttribute(options.transcriptIntro) + '"' : "",
      ' data-video-autoplay="', options.autoplay === false ? "false" : "true", '"',
      ' data-video-loop="', options.loop === false ? "false" : "true", '"',
      "></div>"
    ].join("");
  }

  function buildMarkup(options) {
    return [
      '<section class="media-player-card is-paused" aria-label="', escapeAttribute(options.title), ' media player">',
      '  <div class="media-player-shell">',
      '    <div class="media-player-stage">',
      '      <video class="media-player-video" preload="metadata" playsinline muted',
      options.autoplay ? " autoplay" : "",
      options.loop ? " loop" : "",
      ">",
      options.src ? '        <source src="' + escapeAttribute(options.src) + '" type="video/mp4">' : "",
      options.captions ? '        <track kind="captions" src="' + escapeAttribute(options.captions) + '" srclang="en" label="Guide captions">' : "",
      "      </video>",
      "    </div>",
      '    <div class="media-player-controls">',
      '      <div class="media-player-control-group">',
      '        <button class="media-player-control is-primary" type="button" data-player-toggle>Pause</button>',
      '        <button class="media-player-control" type="button" data-player-restart>Restart</button>',
      '        <button class="media-player-control" type="button" data-player-mute>Muted</button>',
      "      </div>",
      '      <div class="media-player-progress">',
      '        <input class="media-player-seek" type="range" min="0" max="1000" value="0" step="1" data-player-seek aria-label="Seek video">',
      '        <div class="media-player-time"><span data-player-current>00:00</span><span data-player-duration>00:00</span></div>',
      "      </div>",
      '      <div class="media-player-control-group is-right">',
      '        <select class="media-player-rate" data-player-rate aria-label="Playback speed">',
      '          <option value="0.75">0.75x</option>',
      '          <option value="1" selected>1x</option>',
      '          <option value="1.25">1.25x</option>',
      '          <option value="1.5">1.5x</option>',
      "        </select>",
      '        <button class="media-player-control" type="button" data-player-fullscreen>Full</button>',
      "      </div>",
      "    </div>",
      "  </div>",
      "</section>"
    ].join("");
  }

  function setSeekFill(input) {
    var min = Number(input.min || 0);
    var max = Number(input.max || 1000);
    var value = Number(input.value || 0);
    var ratio = max > min ? ((value - min) / (max - min)) * 100 : 0;

    input.style.setProperty("--player-progress", ratio + "%");
  }

  function setTrackMode(video, enabled) {
    Array.prototype.forEach.call(video.textTracks || [], function (track) {
      track.mode = enabled ? "showing" : "hidden";
    });
  }

  function updateButtons(state) {
    var label = state.video.paused ? "Play" : "Pause";
    var card = state.node.querySelector(".media-player-card");
    var isFullscreen = (
      state.fullscreenHost &&
      document.fullscreenElement === state.fullscreenHost
    );

    state.toggleButtons.forEach(function (button) {
      button.textContent = label;
      button.setAttribute("aria-label", state.video.paused ? "Play video" : "Pause video");
    });

    state.muteButton.textContent = state.video.muted ? "Muted" : "Sound on";
    if (state.captionsButton) {
      state.captionsButton.classList.toggle("is-active", state.captionsVisible);
    }

    if (state.transcriptButton && state.transcriptPanel) {
      state.transcriptButton.classList.toggle("is-active", !state.transcriptPanel.hidden);
    }
    state.currentTime.textContent = formatTime(state.video.currentTime);
    state.duration.textContent = formatTime(state.video.duration || 0);
    state.fullscreenButton.textContent = isFullscreen ? "Exit full" : "Full";
    state.fullscreenButton.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Open fullscreen");
    state.seek.value = state.video.duration
      ? Math.round((state.video.currentTime / state.video.duration) * 1000)
      : 0;
    setSeekFill(state.seek);

    if (card) {
      card.classList.toggle("is-playing", !state.video.paused);
      card.classList.toggle("is-paused", state.video.paused);
    }
  }

  function playVideo(state, userTriggered) {
    var playPromise;

    if (userTriggered) {
      state.userPaused = false;
    }

    playPromise = state.video.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(function () {
        updateButtons(state);
      });
    }
  }

  function pauseVideo(state, userTriggered) {
    if (userTriggered) {
      state.userPaused = true;
    }
    state.video.pause();
    updateButtons(state);
  }

  function initPlayer(node) {
    var options;
    var video;
    var transcriptPanel;
    var state;

    if (!node || node.getAttribute("data-player-ready") === "true") {
      return;
    }

    options = readOptions(node);
    node.innerHTML = buildMarkup(options);
    node.setAttribute("data-player-ready", "true");

    video = node.querySelector(".media-player-video");
    transcriptPanel = node.querySelector(".media-player-transcript");

    state = {
      node: node,
      options: options,
      video: video,
      currentTime: node.querySelector("[data-player-current]"),
      duration: node.querySelector("[data-player-duration]"),
      seek: node.querySelector("[data-player-seek]"),
      muteButton: node.querySelector("[data-player-mute]"),
      captionsButton: node.querySelector("[data-player-captions]"),
      transcriptButton: node.querySelector("[data-player-transcript]"),
      transcriptPanel: transcriptPanel,
      fullscreenButton: node.querySelector("[data-player-fullscreen]"),
      fullscreenHost: node.querySelector(".media-player-shell"),
      rateSelect: node.querySelector("[data-player-rate]"),
      toggleButtons: Array.prototype.slice.call(node.querySelectorAll("[data-player-toggle]")),
      userPaused: false,
      captionsVisible: false
    };

    node.__playerState = state;

    if (state.captionsButton && !options.captions) {
      state.captionsButton.disabled = true;
    }

    state.toggleButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        if (state.video.paused) {
          playVideo(state, true);
        } else {
          pauseVideo(state, true);
        }
      });
    });

    node.querySelector("[data-player-restart]").addEventListener("click", function () {
      state.video.currentTime = 0;
      playVideo(state, true);
    });

    state.muteButton.addEventListener("click", function () {
      state.video.muted = !state.video.muted;
      updateButtons(state);
    });

    if (state.captionsButton) {
      state.captionsButton.addEventListener("click", function () {
        state.captionsVisible = !state.captionsVisible;
        setTrackMode(state.video, state.captionsVisible);
        updateButtons(state);
      });
    }

    if (state.transcriptButton && state.transcriptPanel) {
      state.transcriptButton.addEventListener("click", function () {
        state.transcriptPanel.hidden = !state.transcriptPanel.hidden;
        updateButtons(state);
      });
    }

    state.fullscreenButton.addEventListener("click", function () {
      var requestPromise;

      if (document.fullscreenElement) {
        document.exitFullscreen();
        return;
      }

      if (state.fullscreenHost && state.fullscreenHost.requestFullscreen) {
        requestPromise = state.fullscreenHost.requestFullscreen();
        if (requestPromise && typeof requestPromise.catch === "function") {
          requestPromise.catch(function () {
            updateButtons(state);
          });
        }
      }
    });

    document.addEventListener("fullscreenchange", function () {
      updateButtons(state);
    });

    state.rateSelect.addEventListener("change", function () {
      state.video.playbackRate = Number(state.rateSelect.value || 1);
    });

    state.seek.addEventListener("input", function () {
      var duration = state.video.duration || 0;
      if (!duration) {
        return;
      }
      state.video.currentTime = duration * (Number(state.seek.value || 0) / 1000);
      updateButtons(state);
    });

    ["loadedmetadata", "timeupdate", "durationchange", "play", "pause", "volumechange"].forEach(function (eventName) {
      state.video.addEventListener(eventName, function () {
        updateButtons(state);
      });
    });

    state.video.addEventListener("loadedmetadata", function () {
      setTrackMode(state.video, false);
      updateButtons(state);
    });

    updateButtons(state);
  }

  var observer = typeof window.IntersectionObserver === "function"
    ? new window.IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var state = entry.target.__playerState;

          if (!state || !state.options.autoplay) {
            return;
          }

          if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
            if (!state.userPaused) {
              playVideo(state, false);
            }
            return;
          }

          if (!state.video.paused) {
            state.video.pause();
            updateButtons(state);
          }
        });
      }, {
        threshold: [0.2, 0.45, 0.7]
      })
    : null;

  function hydrate(root) {
    var targets = [];

    if (!root) {
      return;
    }

    if (root.matches && root.matches("[data-video-card]")) {
      targets.push(root);
    }

    Array.prototype.push.apply(targets, root.querySelectorAll ? root.querySelectorAll("[data-video-card]") : []);

    targets.forEach(function (node) {
      initPlayer(node);
      if (observer) {
        observer.observe(node);
      } else if (node.__playerState && node.__playerState.options.autoplay) {
        playVideo(node.__playerState, false);
      }
    });
  }

  window.RedwoodVideoPlayer = {
    createMountMarkup: createMountMarkup,
    hydrate: hydrate
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      hydrate(document);
    });
  } else {
    hydrate(document);
  }
}());
