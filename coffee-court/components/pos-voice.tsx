"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send, Square, X } from "lucide-react";
import type { Item, Product, Stock } from "../lib/domain";
import { productVariants, money } from "../lib/domain";
import { mergePosItems } from "../lib/pos-bills";
import {
  normalizeVoice,
  parseVoiceCommand,
  voiceItems,
  type VoiceCommand,
} from "../lib/pos-voice";
type SpeechResult = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};
type Recognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<SpeechResult>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognizer;
  webkitSpeechRecognition?: new () => Recognizer;
};
type Props = {
  billId: string;
  products: Product[];
  inventory: Stock[];
  cart: Item[];
  blocked: boolean;
  add: (items: Item[], id: string) => void;
};
export default function PosVoice(props: Props) {
  const [enabled, setEnabled] = useState(false),
    [listening, setListening] = useState(false),
    [supported, setSupported] = useState(true),
    [text, setText] = useState(""),
    [interim, setInterim] = useState(""),
    [feedback, setFeedback] = useState(""),
    [error, setError] = useState(""),
    [pending, setPending] = useState<VoiceCommand | null>(null);
  const latest = useRef(props),
    recognizer = useRef<Recognizer | null>(null),
    generation = useRef(0),
    wanted = useRef(false),
    restart = useRef<ReturnType<typeof setTimeout> | null>(null),
    retries = useRef(0),
    pendingRef = useRef(pending),
    mounted = useRef(true);
  latest.current = props;
  pendingRef.current = pending;
  function stop() {
    wanted.current = false;
    generation.current++;
    if (restart.current) clearTimeout(restart.current);
    const instance = recognizer.current;
    recognizer.current = null;
    instance?.abort();
    setListening(false);
    setInterim("");
  }
  function apply(command: VoiceCommand) {
    const p = latest.current;
    if (p.blocked)
      throw new Error("Close the open dialog before adding items.");
    const items = voiceItems(command, p.products, p.inventory, p.cart);
    p.add(items, p.billId);
    // Recognition may deliver several final utterances before React renders.
    latest.current = { ...p, cart: mergePosItems(p.cart, items) };
    setPending(null);
    pendingRef.current = null;
    setFeedback(
      `Added ${items.map((i) => `${i.quantity} × ${i.name}${i.variant !== "Standard" ? ` (${i.variant})` : ""}`).join(", ")}.`,
    );
    setText("");
  }
  function process(transcript: string) {
    if (latest.current.blocked || !mounted.current) return;
    setError("");
    setInterim("");
    try {
      const current = pendingRef.current,
        missing = current?.lines.filter((l) => !l.variant) || [],
        answer = normalizeVoice(transcript);
      let command: VoiceCommand;
      if (current && missing.length === 1 && ["hot", "cold"].includes(answer)) {
        command = {
          ...current,
          lines: current.lines.map((l) =>
            !l.variant
              ? { ...l, variant: answer === "hot" ? "Hot" : "Cold" }
              : l,
          ),
          needsChoice: false,
        };
      } else command = parseVoiceCommand(transcript, latest.current.products);
      setPending(command);
      pendingRef.current = command;
      if (command.needsChoice) {
        setFeedback(
          "Choose the highlighted variants below, or say hot or cold for a single item. Nothing has been added yet.",
        );
      } else apply(command);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function start() {
    if (latest.current.blocked) return;
    stop();
    setError("");
    setFeedback("");
    const Constructor =
      (window as SpeechWindow).SpeechRecognition ||
      (window as SpeechWindow).webkitSpeechRecognition;
    if (!Constructor) {
      setSupported(false);
      setError(
        "Voice recognition is unavailable here. Use Chrome or Edge with microphone access, or type a command below.",
      );
      return;
    }
    wanted.current = true;
    const token = ++generation.current,
      scope = latest.current.billId;
    function run() {
      if (
        !wanted.current ||
        token !== generation.current ||
        latest.current.blocked ||
        latest.current.billId !== scope ||
        document.hidden
      )
        return;
      const instance = new Constructor!(),
        seen = new Set<number>();
      recognizer.current = instance;
      instance.lang = "en-IN";
      instance.continuous = true;
      instance.interimResults = true;
      const valid = () =>
        mounted.current &&
        wanted.current &&
        token === generation.current &&
        latest.current.billId === scope &&
        !latest.current.blocked &&
        recognizer.current === instance;
      instance.onstart = () => {
        if (valid()) {
          setListening(true);
          setError("");
        }
      };
      instance.onresult = (event) => {
        if (!valid()) return;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            if (!seen.has(i)) {
              seen.add(i);
              retries.current = 0;
              process(result[0].transcript);
            }
          } else setInterim(result[0].transcript);
        }
      };
      instance.onerror = (event) => {
        if (!valid()) return;
        if (event.error === "no-speech" && retries.current++ < 2) return;
        const messages: Record<string, string> = {
          "not-allowed":
            "Microphone access was denied. Allow it in your browser settings, then start again.",
          "service-not-allowed":
            "Your browser’s speech service is unavailable. Type the command below.",
          "audio-capture":
            "No microphone was found. Connect a microphone and try again.",
          network:
            "Speech recognition needs an internet connection. Check your connection or type a command.",
          "no-speech":
            "No speech detected. Start listening when you are ready.",
        };
        setError(
          messages[event.error] ||
            "Voice recognition stopped. Start again or type a command.",
        );
        stop();
      };
      instance.onend = () => {
        if (!valid()) return;
        setListening(false);
        if (retries.current++ < 3) restart.current = setTimeout(run, 350);
        else {
          setFeedback("Listening paused. Start again when ready.");
          stop();
        }
      };
      try {
        instance.start();
      } catch {
        stop();
        setError(
          "Could not start the microphone. Try again or type a command.",
        );
      }
    }
    run();
  }
  useEffect(() => {
    mounted.current = true;
    setSupported(
      Boolean(
        (window as SpeechWindow).SpeechRecognition ||
        (window as SpeechWindow).webkitSpeechRecognition,
      ),
    );
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      mounted.current = false;
      wanted.current = false;
      generation.current++;
      if (restart.current) clearTimeout(restart.current);
      recognizer.current?.abort();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEffect(() => {
    if (props.blocked) stop();
  }, [props.blocked]);
  return (
    <section className="pos-voice" aria-label="Voice item entry">
      <div className="pos-voice-heading">
        <div>
          <Mic size={18} />
          <strong>Quick item entry</strong>
          <span className={listening ? "voice-state listening" : "voice-state"}>
            {listening ? "Listening…" : enabled ? "Paused" : "Voice off"}
          </span>
        </div>
        <button
          className="voice-toggle"
          role="switch"
          aria-checked={enabled}
          aria-label="Enable POS voice commands"
          disabled={props.blocked}
          onClick={() => {
            if (enabled) {
              stop();
              setEnabled(false);
              setPending(null);
              setError("");
            } else {
              setEnabled(true);
              retries.current = 0;
              start();
            }
          }}
        >
          {enabled ? <Mic size={15} /> : <MicOff size={15} />}{" "}
          {enabled ? "Enabled" : "Enable voice"}
        </button>
      </div>
      {enabled && (
        <div className="voice-listen-row">
          <p>
            {supported
              ? "Say “one brownie cold coffee” or “two cappuccinos and one veg sandwich”."
              : "Microphone recognition is unsupported in this browser. Typed commands still work."}
          </p>
          <button
            type="button"
            className="btn secondary small"
            disabled={props.blocked || !supported}
            onClick={() => {
              if (listening || wanted.current) stop();
              else {
                retries.current = 0;
                start();
              }
            }}
          >
            {listening ? <Square size={14} /> : <Mic size={14} />}{" "}
            {listening ? "Stop" : "Start listening"}
          </button>
        </div>
      )}
      <form
        className="voice-command-form"
        onSubmit={(e) => {
          e.preventDefault();
          process(text);
        }}
      >
        <input
          aria-label="Quick item command"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={props.blocked}
          placeholder="Type or say: 1 brownie cold coffee"
          maxLength={500}
        />
        <button
          className="btn secondary small"
          disabled={props.blocked || !text.trim()}
          title="Add command"
          aria-label="Add quick command"
        >
          <Send size={15} />
          <span>Add</span>
        </button>
      </form>
      {interim && <p className="voice-transcript">Hearing: {interim}</p>}
      <div role="status" aria-live="polite">
        {feedback && <p className="voice-feedback">{feedback}</p>}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {pending?.needsChoice && (
        <div className="voice-choices">
          {pending.lines.map((line, n) => {
            const p = props.products.find((p) => p.id === line.productId);
            if (!p) return null;
            return (
              <label key={n}>
                {line.quantity} × {p.name}
                <select
                  aria-label={`Variant for ${p.name}`}
                  value={line.variant || ""}
                  disabled={props.blocked}
                  onChange={(e) => {
                    const command = {
                      ...pending,
                      lines: pending.lines.map((l, i) =>
                        i === n
                          ? { ...l, variant: e.target.value || undefined }
                          : l,
                      ),
                    };
                    command.needsChoice = command.lines.some((l) => !l.variant);
                    setPending({ ...command, needsChoice: true });
                    pendingRef.current = command;
                  }}
                >
                  <option value="">Choose variant</option>
                  {productVariants(p).map((v) => (
                    <option key={v.label} value={v.label}>
                      {v.label} · {money(v.price)}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
          <div>
            <button
              className="btn primary small"
              disabled={props.blocked || pending.lines.some((l) => !l.variant)}
              onClick={() => {
                try {
                  setError("");
                  apply(pending);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Add these items
            </button>
            <button
              className="text-btn"
              onClick={() => {
                setPending(null);
                pendingRef.current = null;
                setFeedback("");
              }}
            >
              <X size={14} />
              Dismiss
            </button>
          </div>
        </div>
      )}
      {enabled && (
        <small className="voice-privacy">
          Only final speech adds items to this bill. Your browser may process
          audio through its speech service. Review the bill before payment.
        </small>
      )}
    </section>
  );
}
