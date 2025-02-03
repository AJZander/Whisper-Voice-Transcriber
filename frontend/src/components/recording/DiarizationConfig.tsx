import React from "react";
import { InputNumber } from "primereact/inputnumber";
import { Card } from "primereact/card";
import { Tooltip } from "primereact/tooltip";

interface DiarizationConfig {
	num_speakers: number;
	min_duration_off: number;
	offset: number;
}

interface DiarizationConfigProps {
	config: DiarizationConfig;
	onChange: (newConfig: DiarizationConfig) => void;
}

const DiarizationConfigEditor: React.FC<DiarizationConfigProps> = ({ config, onChange }) => {
	const handleNumSpeakersChange = (e: { value: number | null }) => {
		onChange({ ...config, num_speakers: e.value || 1 });
	};

	const handleMinDurationOffChange = (e: { value: number | null }) => {
		onChange({ ...config, min_duration_off: e.value || 0.5 });
	};

	const handleOffsetChange = (e: { value: number | null }) => {
		onChange({ ...config, offset: e.value || 0.7 });
	};

	return (
		<Card className="shadow-1">
			<div className="flex flex-column ">
				<div>
					<h3>Diarization Config</h3>
				</div>
				<div className="flex flex-column">
					<div className="field mb-0">
						<label
							htmlFor="numSpeakers"
							className="block text-sm font-medium mb-1"
							data-pr-tooltip="Number of speakers to detect"
						>
							# Speakers
						</label>
						<InputNumber
							id="numSpeakers"
							value={config.num_speakers}
							onChange={handleNumSpeakersChange}
							showButtons
							buttonLayout="horizontal"
							min={1}
							max={100}
							step={1}
							className="w-6rem"
							inputClassName="text-center"
						/>
					</div>
				</div>

				<div className="flex flex-column">
					<div className="field mb-0">
						<label
							htmlFor="minDurationOff"
							className="block text-sm font-medium mb-1"
							data-pr-tooltip="Minimum duration between speaker segments"
						>
							Min Duration Off
						</label>
						<InputNumber
							id="minDurationOff"
							value={config.min_duration_off}
							onChange={handleMinDurationOffChange}
							mode="decimal"
							minFractionDigits={1}
							maxFractionDigits={2}
							className="w-7rem"
							inputClassName="text-center"
							step={0.1}
						/>
					</div>
				</div>

				<div className="flex flex-column">
					<div className="field mb-0">
						<label
							htmlFor="offset"
							className="block text-sm font-medium mb-1"
							data-pr-tooltip="Time offset for speaker detection"
						>
							Offset
						</label>
						<InputNumber
							id="offset"
							value={config.offset}
							onChange={handleOffsetChange}
							mode="decimal"
							minFractionDigits={1}
							maxFractionDigits={2}
							className="w-6rem"
							inputClassName="text-center"
							step={0.1}
						/>
					</div>
				</div>
			</div>
			<Tooltip target="label" />
		</Card>
	);
};

export default DiarizationConfigEditor;