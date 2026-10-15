import Input from '../../../../components/ui/Input';
import CommaListInput from '../../../../components/ui/CommaListInput';
import Textarea from '../../../../components/ui/Textarea';
import { Switch } from '../../../../components/ui/Primitives';
import ServiceQuestionField from '../ServiceQuestionField';

/** Step 2 — project brief + conditional questions for the chosen service. */
export default function StepProject({ data, update, errors, questions }) {
  const setAnswer = (key, value) => update({ answers: { ...data.answers, [key]: value } });
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-semibold text-ink-900">Tell us about the project</h2>
        <p className="mt-2 text-ink-600">{data.serviceTitle ? `A few questions about your ${data.serviceTitle.toLowerCase()} project.` : 'Share as much or as little as you know so far.'}</p>
      </div>
      <Input label="Project title (optional)" value={data.projectTitle} onChange={(e) => update({ projectTitle: e.target.value })} maxLength={160} />
      <Textarea
        label="Project description"
        required
        rows={6}
        value={data.description}
        onChange={(e) => update({ description: e.target.value })}
        error={errors.description}
        maxLength={5000}
        hint="What is it, who is it for, and what does success look like?"
      />

      {questions.length > 0 && (
        <div className="grid gap-6 rounded-2xl border border-paper-300 bg-paper-50 p-5 sm:p-6">
          {questions.map((q) => (
            <ServiceQuestionField key={q.key} question={q} value={data.answers?.[q.key]} onChange={(v) => setAnswer(q.key, v)} error={errors[`answers.${q.key}`]} />
          ))}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Input label="Filming location(s)" value={data.location} onChange={(e) => update({ location: e.target.value })} maxLength={200} placeholder="City, region or ‘not decided’" />
        <CommaListInput
          label="Deliverables you need"
          value={data.deliverables}
          onChange={(x) => update({ deliverables: x })}
          max={20}
          hint="Separate with commas — e.g. 60s ad, 15s cut-down"
        />
        <Input label="Preferred start date" type="date" value={data.preferredStartDate} onChange={(e) => update({ preferredStartDate: e.target.value })} />
        <Input label="Preferred delivery date" type="date" value={data.preferredEndDate} onChange={(e) => update({ preferredEndDate: e.target.value })} error={errors.preferredEndDate} />
      </div>
      <Switch checked={data.datesFlexible} onChange={(v) => update({ datesFlexible: v })} label="My dates are flexible" />
    </div>
  );
}
