import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { AlleleProfile } from '../allele-profiles/allele-profiles.schema';
import {
  ImportAlleleProfilesDto,
  UpdateSampleIdDto,
} from './dto/import-allele-profiles.dto';

function loadProfiles(): string[] {
  const constantsPath = path.join(process.cwd(), '../scripts/constants.py');
  const content = fs.readFileSync(constantsPath, 'utf-8');
  const match = content.match(/^AVAILABLE_PROFILES\s*=\s*\[([\s\S]*?)\]/m);
  if (!match)
    throw new Error('AVAILABLE_PROFILES not found in scripts/constants.py');
  return (match[1].match(/["']([^"']+)["']/g) ?? []).map((s) => s.slice(1, -1));
}

export const PROFILES = loadProfiles();

@Injectable()
export class ChewbbacaService {
  constructor(
    @InjectModel(AlleleProfile.name)
    private readonly model: Model<AlleleProfile>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async listAlleleProfiles(analysis_profile?: string) {
    const query: Record<string, string> = {};
    if (analysis_profile) query.analysis_profile = analysis_profile;
    return this.model
      .find(query)
      .select('sample_id analysis_profile filename imported_at source')
      .sort({ imported_at: -1 })
      .lean()
      .exec();
  }

  async deleteAlleleProfiles(ids: string[]) {
    await this.model.deleteMany({ _id: { $in: ids } });
  }

  async deleteAlleleProfile(id: string) {
    await this.model.findByIdAndDelete(id);
  }

  async updateSampleId(id: string, dto: UpdateSampleIdDto) {
    try {
      return await this.model
        .findByIdAndUpdate(
          id,
          { $set: { sample_id: dto.sample_id } },
          { new: true },
        )
        .lean()
        .exec();
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException(
          `Sample ID '${dto.sample_id}' already exists for this profile.`,
        );
      }
      throw err;
    }
  }

  async getPendingSamples() {
    const db = this.connection.db!;
    const allPending: any[] = [];
    try {
      for (const profile of PROFILES) {
        const stored = await db
          .collection('allele_profiles')
          .find({ analysis_profile: profile })
          .project({
            _id: 1,
            sample_id: 1,
            filename: 1,
            imported_at: 1,
            analysis_profile: 1,
          })
          .toArray();
        if (!stored.length) continue;

        const latest = await db
          .collection('clustering')
          .findOne({ analysis_profile: profile }, { sort: { createdAt: -1 } });

        const clustered = new Set(
          ((latest as any)?.results ?? []).map((r: any) => r.ID as string),
        );

        const notInClustering = stored.filter(
          (s: any) => !clustered.has(s.sample_id),
        );
        if (!notInClustering.length) continue;

        const notInClusteringIds = notInClustering.map((s: any) => s.sample_id);
        const alreadyInFeatures = await db
          .collection('features')
          .distinct('properties.ID', {
            'properties.ID': { $in: notInClusteringIds },
            'properties.analysis_profile': profile,
          });
        const analyzedSet = new Set(alreadyInFeatures as string[]);

        allPending.push(
          ...notInClustering.filter((s: any) => !analyzedSet.has(s.sample_id)),
        );
      }
    } catch {}
    return allPending.sort(
      (a, b) =>
        new Date(b.imported_at).getTime() - new Date(a.imported_at).getTime(),
    );
  }

  async importProfiles(dto: ImportAlleleProfilesDto) {
    const { analysis_profile, filename, samples } = dto;
    let imported = 0;
    let skipped = 0;
    let updated = 0;

    for (const s of samples) {
      const sampleFilename = s.filename ?? filename;
      const filter = { sample_id: s.sample_id, analysis_profile };

      if (s.action === 'replace') {
        const result = await this.model.updateOne(
          filter,
          {
            $set: { alleles: s.alleles, updated_at: new Date() },
            $setOnInsert: {
              imported_at: new Date(),
              filename: sampleFilename,
              source: 'chewbbaca',
            },
          },
          { upsert: true },
        );
        if (result.upsertedCount > 0) imported++;
        else updated++;
      } else {
        try {
          await this.model.create({
            sample_id: s.sample_id,
            analysis_profile,
            alleles: s.alleles,
            filename: sampleFilename,
            source: 'chewbbaca',
            imported_at: new Date(),
          });
          imported++;
        } catch (err: any) {
          if (err.code === 11000) skipped++;
          else throw err;
        }
      }
    }

    return { imported, skipped, updated, total: samples.length };
  }
}
