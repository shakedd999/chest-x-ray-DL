# Model location for loading
MODEL_ID_IN_DRIVE = '12IvZHUMstHp8tVTkVdUCbEFCF_8BPI8z'
MODEL_FILE_NAME = 'xray_model_fine_tuning_project_final_result.keras'

# The order of the classes during the training (NIH ChestX-ray14 minus Hernia, alphabetical)
CLASSES = {
    0: 'Atelectasis',
    1: 'Cardiomegaly',
    2: 'Consolidation',
    3: 'Edema',
    4: 'Effusion',
    5: 'Emphysema',
    6: 'Fibrosis',
    7: 'Infiltration',
    8: 'Mass',
    9: 'Nodule',
    10: 'Pleural_Thickening',
    11: 'Pneumonia',
    12: 'Pneumothorax',
}

# Per-class decision thresholds, same order as CLASSES. Each is the cutoff that
# maximised validation F1 for that class, taken from the threshold-tuning cell of
# backend/model/training/xray_model_training.ipynb. Re-tune and update both here and
# frontend/src/data/classes.js whenever the model is retrained.
THRESHOLDS_FOR_PREDICTIONS = [0.34, 0.48, 0.25, 0.42, 0.51, 0.52, 0.26, 0.31, 0.32, 0.26, 0.39, 0.17, 0.47]
