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

# Per-class decision thresholds tuned on the validation set (same order as CLASSES)
THRESHOLDS_FOR_PREDICTIONS = [0.37, 0.42, 0.29, 0.46, 0.40, 0.53, 0.30, 0.32, 0.32, 0.27, 0.31, 0.25, 0.49]
