const DiarizationConfig = ({ config, onChange }) => {
	const updateConfig = (key, value) => {
		onChange({ ...config, [key]: value });
	};

	const formatValue = (value) => Number(value).toFixed(2);

	return (
		<div style={{ width: '100%', border: '1px solid #ddd', borderRadius: '8px', padding: '16px' }}>
			<h2>Diarization Settings</h2>
			<p>Adjust settings to optimize speaker detection and segmentation</p>

			<div style={{ marginBottom: '16px' }}>
				<label htmlFor="num-speakers">
					Number of Speakers ({config.num_speakers})
				</label>
				<input
					id="num-speakers"
					type="number"
					min={1}
					max={10}
					value={config.num_speakers}
					onChange={(e) => updateConfig('num_speakers', parseInt(e.target.value))}
					style={{ width: '50px', marginLeft: '8px' }}
				/>
				<input
					type="range"
					min={1}
					max={10}
					step={1}
					value={config.num_speakers}
					onChange={(e) => updateConfig('num_speakers', parseInt(e.target.value))}
					style={{ width: '100%', marginTop: '8px' }}
				/>
			</div>

			<div style={{ marginBottom: '16px' }}>
				<label htmlFor="min-duration">
					Minimum Pause Duration (seconds) ({formatValue(config.min_duration_off)})
				</label>
				<input
					id="min-duration"
					type="number"
					min={0}
					max={2}
					step={0.1}
					value={config.min_duration_off}
					onChange={(e) => updateConfig('min_duration_off', parseFloat(e.target.value))}
					style={{ width: '50px', marginLeft: '8px' }}
				/>
				<input
					type="range"
					min={0}
					max={2}
					step={0.1}
					value={config.min_duration_off}
					onChange={(e) => updateConfig('min_duration_off', parseFloat(e.target.value))}
					style={{ width: '100%', marginTop: '8px' }}
				/>
			</div>

			<div>
				<label htmlFor="offset">
					Clustering Threshold ({formatValue(config.offset)})
				</label>
				<input
					id="offset"
					type="number"
					min={0}
					max={1}
					step={0.1}
					value={config.offset}
					onChange={(e) => updateConfig('offset', parseFloat(e.target.value))}
					style={{ width: '50px', marginLeft: '8px' }}
				/>
				<input
					type="range"
					min={0}
					max={1}
					step={0.1}
					value={config.offset}
					onChange={(e) => updateConfig('offset', parseFloat(e.target.value))}
					style={{ width: '100%', marginTop: '8px' }}
				/>
			</div>
		</div>
	);
};

export default DiarizationConfig;
