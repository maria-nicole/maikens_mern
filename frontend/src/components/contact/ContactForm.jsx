import { useState } from "react";
import { Loader2 } from "lucide-react";

const EMPTY_FORM = { name: "", email: "", subject: "", message: "" };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
    "block w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-neutral-800 shadow-xs " +
    "placeholder:text-stone-400 outline-none focus:border-yellow-600/89 focus:ring-2 focus:ring-yellow-600/30";

// TODO: connect this to your backend. Right now it only simulates a send, so NO message
// is actually delivered. Replace the body with something like:
//   await axios.post(`${API_URL}/api/messages`, values);
async function sendMessage(values) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return values;
}

function Field({ id, label, optional, error, children }) {
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-800">
                {label}
                {optional && <span className="ml-1 font-normal text-stone-400">(optional)</span>}
            </label>
            {children}
            {error && (
                <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}

export default function ContactForm() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState("idle"); // idle | sending | sent | failed

    const update = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
        if (status === "sent" || status === "failed") setStatus("idle");
    };

    const validate = () => {
        const next = {};
        if (!form.name.trim()) next.name = "Please enter your name.";
        if (!form.email.trim()) next.email = "Please enter your email.";
        else if (!EMAIL_PATTERN.test(form.email.trim())) next.email = "That email doesn't look right.";
        if (!form.message.trim()) next.message = "Please write a message.";
        return next;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (status === "sending") return;

        const found = validate();
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        setStatus("sending");
        try {
            await sendMessage({
                name: form.name.trim(),
                email: form.email.trim(),
                subject: form.subject.trim(),
                message: form.message.trim(),
            });
            setForm(EMPTY_FORM);
            setStatus("sent");
        } catch {
            setStatus("failed");
        }
    };

    const invalid = (field) => (errors[field] ? { "aria-invalid": true, "aria-describedby": `contact-${field}-error` } : {});

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Field id="contact-name" label="Your name" error={errors.name}>
                <input
                    id="contact-name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={update("name")}
                    placeholder="Your Name"
                    className={inputClass}
                    {...invalid("name")}
                />
            </Field>

            <Field id="contact-email" label="Your email" error={errors.email}>
                <input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="name@gmail.com"
                    className={inputClass}
                    {...invalid("email")}
                />
            </Field>

            <Field id="contact-subject" label="Subject" optional>
                <input
                    id="contact-subject"
                    type="text"
                    value={form.subject}
                    onChange={update("subject")}
                    placeholder="Gown fitting inquiry"
                    className={inputClass}
                />
            </Field>

            <Field id="contact-message" label="Message" error={errors.message}>
                <textarea
                    id="contact-message"
                    rows={5}
                    value={form.message}
                    onChange={update("message")}
                    placeholder="Tell us about the gown or barong you're looking for"
                    className={`${inputClass} resize-none`}
                    {...invalid("message")}
                />
            </Field>

            {status === "sent" && (
                <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    Thanks, your message has been sent. We'll get back to you shortly.
                </p>
            )}
            {status === "failed" && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Something went wrong and your message wasn't sent. Please try again.
                </p>
            )}

            <button
                type="submit"
                disabled={status === "sending"}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-yellow-600/89 bg-yellow-600/89 p-3 font-medium text-white duration-200 hover:bg-white hover:text-yellow-600/89 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-yellow-600/89 disabled:hover:text-white"
            >
                {status === "sending" && <Loader2 size={16} className="animate-spin" />}
                {status === "sending" ? "Sending…" : "Send message"}
            </button>
        </form>
    );
}